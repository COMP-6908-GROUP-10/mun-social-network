export interface IUser {
    user_id?: number;
    username: string;
    identifier?: string;
    email: string;
    password_hash?: string;
    created_at?: string; // ISO date string (from DATETIME)
    followers_count?: number,
    following_count?: number
}

export interface IPost {
    post_id?: number;
    user_id: number;
    identifier?: string;
    user_identifier?: string;
    title?: string;
    content: string;
    media_url?: string;
    created_at?: string;
    user?: IUser; // optional relation
    comment_count?: number,
    like_count?: number,
}

export interface IComment {
    comment_id?: number;
    post_id: number;
    user_id: number;
    parent_comment_id?: number | null;
    post_identifier?: string;
    identifier?: string,
    parent_comment_identifier?: string,
    content: string;
    created_at?: string;
    user?: IUser; // joined user details
    reply_count?: number;
}


export interface IPostLike {
    like_id?: number;         // PK
    post_id: number;          // FK → posts.post_id
    user_id: number;          // FK → users.user_id
    identifier?: string;      // global UUID for the like
    created_at?: string;      // DATETIME → ISO string

    user?: IUser;             // optional joined user
    post?: IPost;             // optional joined post
}

export interface IConnection {
    connection_id?: number;   // PK
    user_id1: number;         // FK → users(user_id)
    user_id2: number;         // FK → users(user_id)
    identifier?: string;      // global UUID for the connection
    status?: "pending" | "accepted" | "blocked";
    created_at?: string;

    user1?: IUser;
    user2?: IUser;
}

export interface IFollow {
    follower_id: number;      // who follows (FK → users.user_id)
    followed_id: number;      // who is followed (FK → users.user_id)
    identifier?: string;      // global UUID for follower row
    created_at?: string;      // DATETIME

    follower?: IUser;         // optional join
    followed?: IUser;         // optional join
}
