import { Socket } from "socket.io";
import { Logger } from "./logger";
import {
    JoinRoomData,
    LeaveRoomData,
    GetRoomUsers,
    GetUserUUIDByTrackID,
    UserAddTrack,
    UserRemoveTrack,
} from "./types";

import {
    rtcOffer,
    rtcAnswer,
    iceCandidate,
    addUserToRoom,
    getRoomUsers,
    removeUserFromRoom,
    trackAdded,
    trackRemoved,
    getUserUUIDByTrackID,
} from "./roomManagement";

export function setupRTCConnectionHandlers(socket: Socket): void {
    // RTC offer
    socket.on("rtc-offer", (offer, targetRoomUUID) => {
        rtcOffer(socket, offer, targetRoomUUID);
    });

    // RTC answer
    socket.on("rtc-answer", (answer, target) => {
        rtcAnswer(socket, answer, target);
    });

    // ICE candidate
    socket.on("ice-candidate", (candidate, target) => {
        iceCandidate(socket, candidate, target);
    });

    socket.on("join-room", (data: JoinRoomData) => {
        addUserToRoom(socket, data.roomUUID, data.userUUID);
    });

    socket.on("leave-room", (data: LeaveRoomData) => {
        removeUserFromRoom(socket, data.roomUUID, data.userUUID);
    });

    socket.on("get-room-users", (data: GetRoomUsers) => {
        getRoomUsers(socket, data.roomUUID);
    });

    socket.on("add-user-track-id", (data: UserAddTrack) => {
        trackAdded(socket, data.roomUUID, data.userUUID, data.trackID);
    });

    socket.on("remove-user-track-id", (data: UserRemoveTrack) => {
        trackRemoved(socket, data.roomUUID, data.userUUID, data.trackID);
    });

    socket.on("get-user-uuid-by-track-id", (data: GetUserUUIDByTrackID) => {
        getUserUUIDByTrackID(socket, data.roomUUID, data.trackID);
    });

    socket.on("disconnect", () => {
        Logger.info("[rtc: user disconnected]");
    });
}
