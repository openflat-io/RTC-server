import { Socket } from "socket.io";
import { Logger } from "./logger";

// userUUID -> socket.id
export const userToSocket = new Map<string, string>();

// roomUUID -> Set<userUUID>
export const roomToUsers = new Map<string, Set<string>>();

// roomUUID -> Map<userUUID, socket.id>
export const userToTrack = new Map<string, Map<string, string[]>>();

export function rtcOffer(socket: Socket, offer: any, roomUUID: string): void {
    Logger.info(`[rtc: Sending RTC offer from ${socket.id} to ${roomUUID}]`);
    if (!roomUUID) {
        Logger.error("[rtc: Target room UUID is not provided]");
        return;
    }

    if (!roomToUsers.has(roomUUID)) {
        roomToUsers.set(roomUUID, new Set());
    } else {
        socket.to(roomUUID).emit("rtc-offer", offer);
        Logger.info(`[rtc: Sending RTC offer from ${socket.id} to ${roomUUID}]`);
    }
}

export function rtcAnswer(socket: Socket, answer: any, roomUUID: string): void {
    Logger.info(`[rtc: Sending RTC answer from ${socket.id} to ${roomUUID}]`);
    if (!roomUUID) {
        Logger.error("[rtc: Target room UUID is not provided]");
        return;
    }

    if (!roomToUsers.has(roomUUID)) {
        roomToUsers.set(roomUUID, new Set());
    } else {
        socket.to(roomUUID).emit("rtc-answer", answer);
        Logger.info(`[rtc: Sending RTC answer from ${socket.id} to ${roomUUID}]`);
    }
}

export function iceCandidate(socket: Socket, candidate: any, roomUUID: string): void {
    Logger.info(`[rtc: Sending ICE candidate from ${socket.id} to ${roomUUID}]`);

    if (!roomUUID) {
        Logger.error("[rtc: Target room UUID is not provided]");
        return;
    }

    if (!roomToUsers.has(roomUUID)) {
        roomToUsers.set(roomUUID, new Set());
    } else {
        socket.to(roomUUID).emit("ice-candidate", candidate);
        Logger.info(`[rtc: Sending ICE candidate from ${socket.id} to ${roomUUID}]`);
    }
}

export function trackAdded(
    socket: Socket,
    roomUUID: string,
    userUUID: string,
    trackID: string,
): void {
    Logger.info(`[rtc: Sending track added from userUUID: ${userUUID} to trackID: ${trackID}]`);

    if (!roomUUID) {
        Logger.error("[rtc: Target room UUID is not provided]");
        return;
    }

    if (!userToTrack.has(roomUUID)) {
        userToTrack.set(roomUUID, new Map());
    }

    const tracks = userToTrack.get(roomUUID)?.get(userUUID) || [];

    if (tracks.includes(trackID)) {
        return;
    }

    userToTrack.get(roomUUID)?.set(userUUID, [...tracks, trackID]);
    socket.to(roomUUID).emit("track-added", { trackID, userUUID });
}

export function trackRemoved(
    socket: Socket,
    roomUUID: string,
    userUUID: string,
    trackID: string,
): void {
    Logger.info(`[rtc: Sending track removed from userUUID: ${userUUID} to trackID: ${trackID}]`);

    if (!roomUUID) {
        Logger.error("[rtc: Target room UUID is not provided]");
        return;
    }

    if (!userToTrack.has(roomUUID) || !userToTrack.get(roomUUID)?.has(userUUID)) {
        return;
    }

    const userTracks = userToTrack.get(roomUUID)?.get(userUUID);

    if (userTracks?.length === 1) {
        userToTrack.get(roomUUID)?.delete(userUUID);
    } else {
        userToTrack.get(roomUUID)?.set(
            userUUID,
            userTracks?.filter(id => id !== trackID),
        );
    }

    socket.to(roomUUID).emit("track-removed", { trackID, userUUID });
}

export const getUserUUIDByTrackID = (socket: Socket, roomUUID: string, trackID: string): void => {
    const users = userToTrack.get(roomUUID);
    if (!users) {
        Logger.info(`[rtc: user not found in - ${roomUUID}]`);
        return;
    }

    let targetUserUUID = null;

    for (const [userUUID, tracks] of users) {
        if (tracks.includes(trackID)) {
            targetUserUUID = userUUID;
        }
    }

    if (!targetUserUUID) {
        Logger.info(`[rtc: target user not found - trackID: ${trackID} - roomUUID: ${roomUUID}]`);
        return;
    }

    socket.to(roomUUID).emit("user-uuid-by-track-id", { userUUID: targetUserUUID, trackID });
    Logger.info(`[rtc: get track owner - targetUserUUID: ${targetUserUUID} - trackID: ${trackID}]`);
};

export async function addUserToRoom(
    socket: Socket,
    roomUUID: string,
    userUUID: string,
): Promise<void> {
    try {
        if (roomToUsers.has(roomUUID) && roomToUsers.get(roomUUID)?.has(userUUID)) {
            Logger.info(`[member: User ${userUUID} already in room ${roomUUID}]`);
            return;
        }

        await socket.join(roomUUID);

        if (!roomToUsers.has(roomUUID)) {
            roomToUsers.set(roomUUID, new Set());
        }
        roomToUsers.get(roomUUID)?.add(userUUID);
        userToSocket.set(userUUID, socket.id);

        // send message to the user who joined
        socket.emit("member-joined", { userUUID });

        // send message to other users in the room
        socket.to(roomUUID).emit("member-joined", { userUUID });

        Logger.info(`[member: User ${userUUID} joined room ${roomUUID}]`);
    } catch (error) {
        Logger.error("[member: Error adding user to room]", error as Error);
    }
}

export function removeUserFromRoom(socket: Socket, roomUUID: string, userUUID: string): void {
    try {
        socket.leave(roomUUID);

        // remove user from room
        const users = roomToUsers.get(roomUUID);
        if (users) {
            users.delete(userUUID);
            if (users.size === 0) {
                roomToUsers.delete(roomUUID);
            }
        }

        // remove user from socket id map
        userToSocket.delete(userUUID);

        // send message to the user who left
        socket.emit("self-left", { success: true });

        // send message to other users in the room
        socket.to(roomUUID).emit("member-left", { userUUID });

        Logger.info(`[member: User ${userUUID} left room ${roomUUID}]`);
    } catch (error) {
        Logger.error("[member: Error removing user from room]", error as Error);
    }
}

export function getRoomUsers(socket: Socket, roomUUID: string): void {
    try {
        const users = roomToUsers.get(roomUUID) || new Set();
        socket.emit("room-users", { users: Array.from(users) });

        Logger.info(
            `[member: Getting users in room ${roomUUID} - ${JSON.stringify(Array.from(users))}]`,
        );
    } catch (error) {
        Logger.error("[member: Error getting room users]", error as Error);
    }
}
