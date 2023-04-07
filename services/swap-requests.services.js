const NotFoundError = require('../errors/not-found.error');
const ValidationError = require('../errors/validation.error');
const { getDriver } = require('../neo4j');
const { sendMatchFoundEmail } = require('../utils/mail');
const validation = require('../utils/validation');



const createSwapRequest = async (user, timeslot) => {
    const wantedTimeslots = timeslot.wantedTimeslots || [];
    const offeredTimeslot = timeslot.offeredTimeslot || "";
    const driver = getDriver();
    const session = driver.session();
    try {
        // validate that the user is not trying to swap a timeslot with itself
        if (wantedTimeslots.includes(offeredTimeslot)) {
            console.log('offeredTimeslot', offeredTimeslot);
            console.log('wantedTimeslots', wantedTimeslots);
            throw new ValidationError('Cannot swap a timeslot with itself');
        }
        
        const wantedTimeslotsRes = await session.readTransaction(tx =>
            tx.run(
                `MATCH (t:Timeslot)
                WHERE t.id IN $wantedTimeslotIds
                RETURN t`,
                { wantedTimeslotIds: wantedTimeslots }
        ));
        if (wantedTimeslotsRes.records.length !== wantedTimeslots.length) {
            console.log('wantedTimeslots', wantedTimeslots);
            throw new NotFoundError('One or more wanted timeslots not found');
        }

        const offeredTimeslotRes = await session.readTransaction(tx =>
            tx.run(
                `MATCH (t:Timeslot)
                WHERE t.id = $offeredTimeslotId
                RETURN t`,
                { offeredTimeslotId: offeredTimeslot }
        ));
        if (offeredTimeslotRes.records.length !== 1) {
            console.log('offeredTimeslot', offeredTimeslot);
            throw new NotFoundError('Offered timeslot not found');
        }

        const offeredTimeslotType = offeredTimeslotRes.records[0].get('t').properties.type;
        const wantedTimeslotTypes = wantedTimeslotsRes.records.map(record => record.get('t').properties.type);
        if (!wantedTimeslotTypes.every(type => type === offeredTimeslotType)) {
            console.log('offeredTimeslotType', offeredTimeslotType);
            console.log('wantedTimeslotTypes', wantedTimeslotTypes);
            throw new ValidationError('Offered and wanted timeslots must be of the same type, either lecture or tutorial');
        }

        // create the swap request

        const startTime = Date.now();

        const res3 = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})
                MATCH (ot:Timeslot)
                WHERE ot.id = $offeredTimeslotId
                CREATE (sr:SwapRequest 
                    {id: randomUUID(), status: 'pending', createdAt: datetime(), updatedAt: datetime()})
                CREATE (u)-[:REQUESTED]->(sr)
                CREATE (sr)-[:OFFERS]->(ot)
                WITH sr, ot
                MATCH (wt:Timeslot)
                WHERE wt.id IN $wantedTimeslotIds
                CREATE (sr)-[:WANTS]->(wt)
                RETURN sr, ot, wt`,
                { userEmail: user.email, offeredTimeslotId: offeredTimeslot , wantedTimeslotIds: wantedTimeslots }
        ));

        const endTime = Date.now();
        console.log('createSwapRequest time taken :', endTime - startTime);

        if (res3.records.length === 0) {
            throw new Error('Failed to create swap request');
        }
        const sr = res3.records[0].get('sr').properties;

        // check if the swap request matches any other swap requests
        const matches = await checkSwapRequestMatches(session, user, sr.id);
        sr.status = matches.length > 0 ? matches[0].status : sr.status;
        return {
            ...sr,
            offeredTimeslot,
            wantedTimeslots,
            matches
        };
    }
    finally {
        await session.close();
    }
}

const checkSwapRequestMatches = async (dbSession, user, swapRequestId) => {
    
    const startTime = Date.now();

    const res = await dbSession.writeTransaction(tx =>
        tx.run(
            `MATCH (u:User {email: $userEmail})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
            MATCH (sr)-[:OFFERS]->(ot:Timeslot)
            MATCH (sr)-[:WANTS]->(wt:Timeslot)
            MATCH (ot)-[:OFFERED_AT]-(c:Course)
            MATCH (sr2:SwapRequest)-[:OFFERS]->(wt)
            MATCH (sr2)-[:WANTS]->(ot)
            MATCH (sr2)<-[:REQUESTED]-(u2:User)
            WHERE sr2.status = 'pending'
            AND NOT (u)-[:REQUESTED]->(sr2)
            SET sr.status = 'waiting-for-agreement'
            SET sr2.status = 'waiting-for-agreement'
            CREATE (sr)-[m:MATCHES {status: 'waiting-for-agreement', timeslot_1: ot.id, timeslot_2: wt.id}]->(sr2)
            RETURN sr, sr2, u2, m, ot, wt, c, u.email`,
            { userEmail: user.email, swapRequestId }
        )
    );
    const endTime = Date.now();
    console.log('checkSwapRequestMatches time taken :', endTime - startTime);
    
    return res.records.map(record => {
        const sr = record.get('sr').properties;
        const sr2 = record.get('sr2').properties;
        const u2 = record.get('u2').properties;
        const m = record.get('m').properties;
        const ot = record.get('ot').properties;
        const wt = record.get('wt').properties;
        const c = record.get('c').properties;
        user.email = record.get('u.email');
        sendMatchFoundEmail(u2.email, c, wt, ot, user.email, user.name);
        return {
            ...sr,
            matchedSwapRequest: sr2,
            matchedUser: u2.email
        };
    });
}

const getSwapRequests = async (user) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        // if a swap request status is waiting-for-agreement, return the matching users too
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:REQUESTED]->(sr:SwapRequest)
                MATCH (sr)-[:OFFERS]->(ot:Timeslot)-[:OFFERED_IN]->(sem:Semester)
                MATCH (sr)-[:WANTS]->(wt:Timeslot)
                MATCH (ot)-[:OFFERED_AT]-(c:Course)
                OPTIONAL MATCH (sr)-[m:MATCHES]-(sr2:SwapRequest)
                OPTIONAL MATCH (matchedTimeslot_1:Timeslot {id: m.timeslot_1})
                OPTIONAL MATCH (matchedTimeslot_2:Timeslot {id: m.timeslot_2})
                OPTIONAL MATCH (sr2)<-[:REQUESTED]-(u2:User)
                RETURN sr, sem, ot, wt, sr2, u2, c, matchedTimeslot_1, matchedTimeslot_2`,
                { userEmail: user.email }
        ));
        // for each swap request, get the offered and wanted timeslots. if there are duplicates swap requests,
        // then the offered and wanted timeslots will be duplicated as well. so we need to group them by swap request id
        const swapRequests = {};
        res.records.forEach(record => {
            const sr = record.get('sr').properties;
            const sem = record.get('sem').properties;
            const ot = record.get('ot').properties;
            const wt = record.get('wt').properties;
            const c = record.get('c').properties;
            const sr2 = record.get('sr2') ? record.get('sr2').properties : null;
            const u2 = record.get('u2') ? record.get('u2').properties : null;
            const matchedTimeslot_1 = record.get('matchedTimeslot_1') ? record.get('matchedTimeslot_1').properties : null;
            const matchedTimeslot_2 = record.get('matchedTimeslot_2') ? record.get('matchedTimeslot_2').properties : null;
            if (!swapRequests[sr.id]) {
                swapRequests[sr.id] = {
                    ...sr,
                    semester: sem.name,
                    offeredTimeslot: ot,
                    wantedTimeslots: [wt],
                    course: c,
                    matches: u2 ? [{
                        ...sr2,
                        matchedTimeslots: {
                            offered: ot.id === matchedTimeslot_1.id ? matchedTimeslot_2 : matchedTimeslot_1,
                            wanted: ot.id === matchedTimeslot_1.id ? matchedTimeslot_1 : matchedTimeslot_2
                        },
                        matchedUser: {
                            name: u2.name,
                            email: u2.email
                        }
                    }] : []
                };
            }
            else {
                if (!swapRequests[sr.id].wantedTimeslots.find(wantedTimeslot => wantedTimeslot.id === wt.id))
                    swapRequests[sr.id].wantedTimeslots.push(wt);
                if (sr2 && !swapRequests[sr.id].matches.find(m => m.id === sr2.id)) {
                    swapRequests[sr.id].matches.push({
                        ...sr2,
                        matchedTimeslots: {
                            offered: ot.id === matchedTimeslot_1.id ? matchedTimeslot_2 : matchedTimeslot_1,
                            wanted: ot.id === matchedTimeslot_1.id ? matchedTimeslot_1 : matchedTimeslot_2
                        },
                        matchedUser: { name: u2.name, email: u2.email }
                    });
                }
            }
        });
        return Object.values(swapRequests);
    }
    finally {
        await session.close();
    }
}

const updateSwapRequest = async (user, timeslotId, timeslot) => {
    const wantedTimeslots = timeslot.wantedTimeslots || [];
    const offeredTimeslot = timeslot.offeredTimeslot || "";

    // TODO: validate offered and wanted timeslots ids

    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
                MATCH (wantedTimeslots:Timeslot) WHERE wantedTimeslots.id IN $wantedTimeslots
                MATCH (offeredTimeslot:Timeslot) WHERE offeredTimeslot.id = $offeredTimeslot
                SET sr.updatedAt = datetime()
                DELETE sr-[w:WANTS]->()
                DELETE sr-[o:OFFERS]->()
                CREATE (sr)-[w:WANTS]->(wantedTimeslots)
                CREATE (sr)-[o:OFFERS]->(offeredTimeslot)
                RETURN sr, w, o`,
                { userEmail: user.email, swapRequestId: timeslotId, wantedTimeslots, offeredTimeslot }
            )
        );
        const sr = res.records[0].get('sr').properties;
        const w = res.records[0].get('w').properties;
        const o = res.records[0].get('o').properties;
        // check if the swap request matches any other swap requests
        const matches = await checkSwapRequestMatches(session, user, sr.id);
        sr.status = matches.length > 0 ? matches[0].status : sr.status;
        return {
            ...sr,
            offeredTimeslot,
            wantedTimeslots,
            matches
        };
    }
    finally {
        await session.close();
    }
}

const agreeSwapRequest = async (user, swapRequestId, matchedSwapRequestId) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        // Regarding the matched swap request SET the matches relationship status to 'agreed' only if both swap requests are in 'agreed' status
        // if there is a multiple matched swap requests, then the other matched swap requests will be deleted and set to 'pending'.
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
                MATCH (sr)-[m1:MATCHES]-(sr2:SwapRequest {id: $matchedSwapRequestId})
                MATCH (sr)-[:OFFERS]->(ot:Timeslot)
                MATCH (sr)-[:WANTS]->(wt:Timeslot)
                MATCH (sr2)-[:OFFERS]->(ot2:Timeslot)
                MATCH (sr2)-[:WANTS]->(wt2:Timeslot)
                SET sr.status = 'agreed'
                SET m1.status = CASE WHEN sr2.status = 'agreed' THEN 'agreed' ELSE m1.status END
                WITH *
                OPTIONAL MATCH (sr)-[m2:MATCHES]->(sr3:SwapRequest)
                WHERE sr3 <> sr2
                DELETE m2
                WITH *
                OPTIONAL MATCH (sr3)-[m3:MATCHES]->(sr4:SwapRequest)
                WHERE sr4 <> sr
                SET sr4.status = CASE WHEN m3.status IS NULL THEN 'pending' ELSE sr3.status END
                RETURN sr, ot, wt, sr2, ot2, wt2, m1`,
                { userEmail: user.email, swapRequestId, matchedSwapRequestId }
            )
        );

        if (res.records.length === 0) {
            throw new ValidationError('Swap request not found');
        }

        const sr = res.records[0].get('sr').properties;
        const ot = res.records[0].get('ot').properties;
        const wt = res.records[0].get('wt').properties;
        const sr2 = res.records[0].get('sr2').properties;
        const ot2 = res.records[0].get('ot2').properties;
        const wt2 = res.records[0].get('wt2').properties;
        const m1 = res.records[0].get('m1').properties;
        return {
            ...sr,
            offeredTimeslot: ot,
            wantedTimeslots: [wt],
            matchedSwapRequest: {
                ...sr2,
                offeredTimeslot: ot2,
                wantedTimeslots: [wt2],
                matches: m1
            }
        };
    }
    finally {
        await session.close();
    }
}

const deleteSwapRequest = async (user, swapRequestId) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        // if a swap request status is waiting-for-agreement, set the status of the matching swap request to pending
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
                OPTIONAL MATCH (sr)-[m:MATCHES]-(sr2:SwapRequest)
                OPTIONAL MATCH (sr2)-[m2:MATCHES]-(sr3:SwapRequest)
                SET sr2.status = CASE WHEN m2 IS NULL THEN 'pending' ELSE sr2.status END
                DETACH DELETE sr RETURN count(sr)`,
                { userEmail: user.email, swapRequestId }
            )
        );
        if (res.records[0].get(0).low === 0) {
            throw new ValidationError('Swap request not found');
        }
        return res.records.length > 0;
    }
    finally {
        await session.close();
    }
}

const disagreeToSwapRequest = async (user, swapRequestId, rejectedSwapRequestId) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:REQUESTED]->(sr:SwapRequest {id: $swapRequestId})
                MATCH (sr)-[m:MATCHES]-(sr2:SwapRequest {id: $rejectedSwapRequestId})
                DELETE m
                SET sr.status = 'pending'
                WITH *
                OPTIONAL MATCH (sr2)-[m2:MATCHES]-(sr3:SwapRequest)
                SET sr2.status = CASE WHEN m2 IS NULL THEN 'pending' ELSE sr2.status END
                RETURN sr`,
                { userEmail: user.email, swapRequestId, rejectedSwapRequestId }
            )
        );
        if (res.records.length === 0) {
            throw new ValidationError('Swap request not found');
        }
        const sr = res.records[0].get('sr').properties;
        const matches = await checkSwapRequestMatches(session, user, sr.id);
        sr.status = matches.length > 0 ? matches[0].status : sr.status;
        return sr;
    }
    finally {
        await session.close();
    }
}

const getSwapRequestsByCourseAndSemester = async (courseCode, semester) => {
    courseCode = validation.validateCourseCode(courseCode);
    semester = validation.validateSemester(semester);

    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (sr:SwapRequest)-[:WANTS]-(wt:Timeslot)-[:OFFERED_AT]-(c:Course {code: $courseCode})
                MATCH (sr)-[:OFFERS]-(ot:Timeslot)-[:OFFERED_IN]-(s:Semester {name: $semester})
                MATCH (sr)-[:REQUESTED]-(u:User)
                WHERE sr.status = 'pending'
                RETURN sr, ot, wt, u`,
                { courseCode , semester }
            )
        );
        // for each swap request, get the offered and wanted timeslots. if there are multiples wanted time slots,
        // then the sr, ot, wt, u will be duplicated. so we need to group them by swap request id
        const swapRequests = {};
        res.records.forEach(record => {
            const sr = record.get('sr').properties;
            const ot = record.get('ot').properties;
            const wt = record.get('wt').properties;
            const u = record.get('u').properties;
            if (!swapRequests[sr.id]) {
                swapRequests[sr.id] = {
                    ...sr,
                    user: {
                        name: u.name, email: u.email
                    },
                    offeredTimeslot: ot,
                    wantedTimeslots: [wt]
                };
            }
            else {
                if (!swapRequests[sr.id].wantedTimeslots.find(wantedTimeslot => wantedTimeslot.id === wt.id))
                    swapRequests[sr.id].wantedTimeslots.push(wt);
            }
        });
        return Object.values(swapRequests);
    }
    finally {
        await session.close();
    }
}





module.exports = {
    getSwapRequests,
    createSwapRequest,
    updateSwapRequest,
    deleteSwapRequest,
    agreeSwapRequest,
    disagreeToSwapRequest,
    getSwapRequestsByCourseAndSemester
};