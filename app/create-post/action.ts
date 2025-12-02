"use server"


import sqlDb from "@/db/sql-db";

export interface CreatePostInput {
    user_id: number;
    title: string;
    content: string;
    media_url: string;

}
export const createPost = async (input: CreatePostInput)=>  {
    const { user_id, title, content, media_url } = input;

    if (!user_id || !content.trim()) {
        throw new Error("user_id and content are required");
    }

    // SQL to Insert new posts
    const insertStmt = sqlDb.prepare(`
      INSERT INTO posts (user_id, title, content, media_url)
      VALUES (:user_id, :title, :content, :media_url)
    `);

    const result = insertStmt.run({
        user_id,
        title,
        content,
        media_url,
    });

    // Retrieve and return the inserted record
    const selectStmt = sqlDb.prepare(`
      SELECT * FROM posts WHERE post_id = :post_id
    `);

    const newPost = selectStmt.get({ post_id: result.lastInsertRowid });

    return {
        success: true,
        message: "IPost created successfully",
        post: newPost,
    };
}