export interface Post {
    id: string;
    title: string;
    content: string;
    image: string;
    user: User
}

export interface User {
    id?: string;
    name: string
    department: string
}


export interface Comment {
    id?: string;
    parentId?: string;
    rootId?: string;
    user: User;
    message: string;
    totalReplies?: number
    totalLikes?: number
}