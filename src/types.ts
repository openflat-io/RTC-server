export interface JoinRoomData {
    roomUUID: string;
    userUUID: string;
}

export interface LeaveRoomData {
    roomUUID: string;
    userUUID: string;
}

export interface GetRoomUsers {
    roomUUID: string;
}

export interface UserAddTrack {
    roomUUID: string;
    userUUID: string;
    trackID: string;
}

export interface UserRemoveTrack {
    roomUUID: string;
    userUUID: string;
    trackID: string;
}

export interface GetUserUUIDByTrackID {
    roomUUID: string;
    trackID: string;
}
