"use server";

import {IComment, IPost} from "@/lib/model-types";
import sqlDb from "@/db/sql-db";

interface GetPostsInput {
    user_id?: number;
    limit?: number;
    offset?: number;
}

export async function getDBPosts(input?: GetPostsInput) {
    const { user_id, limit = 20, offset = 0 } = input || {};

    // SQL query combining home, users, likes, and post-actions
    const stmt = sqlDb.prepare(`
          SELECT
            p.post_id,
            p.content,
            p.media_url,
            p.created_at,
            u.username AS author,
            u.user_id AS author_id,
            COUNT(DISTINCT pl.like_id) AS like_count,
            COUNT(DISTINCT c.comment_id) AS comment_count
          FROM posts p
          JOIN users u ON p.user_id = u.user_id
          LEFT JOIN post_likes pl ON p.post_id = pl.post_id
          LEFT JOIN comments c ON p.post_id = c.post_id
          ${user_id ? "WHERE p.user_id = :user_id" : ""}
          GROUP BY p.post_id
          ORDER BY p.created_at DESC
          LIMIT :limit OFFSET :offset
        `);

    const posts = stmt.all({
        user_id,
        limit,
        offset,
    });

    return {
        success: true,
        posts,
    };
}



export async function getPosts() : Promise<IPost[]> {
    return [

    ]
}


//{
//             id: "10000",
//             title: "Next Js or React Js",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             // image: "https://media.licdn.com/dms/image/v2/D5622AQGOapxGdIaB7Q/feedshare-shrink_800/B56ZmLVm5AI0Ak-/0/1758979323819?e=1762387200&v=beta&t=SNaP1L3PqQoP82h4si_k4UF_41lyhLGu2jNI-AM7Dk8",
//             user: {
//                 name: "Cyndy Matt",
//                 department: "MASc Software Engineering"
//             }
//         },
//         {
//             id: "10001",
//             title: "Investment opportunity",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D4E22AQGykmWSKI5tXg/feedshare-shrink_800/B4EZmmA4cNGoAg-/0/1759426874676?e=1762387200&v=beta&t=IlXtbemUhPxGIrEvkvg9-Vp-NQjFDezlWAM18J6Q3oI",
//             user: {
//                 name: "Gloria Woods",
//                 department: "BSc Business Admin"
//             }
//         },
//         {
//             id: "10002",
//             title: "Busy and broke",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D4D22AQGMMpvI9r9fnA/feedshare-shrink_800/B4DZl7lKvuIEAs-/0/1758714969861?e=1762387200&v=beta&t=7l1AzfyyD7QgxxcEKRMkQRKuysyFtvD65NrDrhWfx6g",
//             user: {
//                 name: "Daniel Matthews",
//                 department: "BSc Database Info"
//             }
//         },
//
//         {
//             id: "10003",
//             title: "5 Ways to be productive",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D4D22AQHoDYDOtB0VyQ/feedshare-shrink_800/B4DZmGJMITGwAg-/0/1758892183192?e=1762387200&v=beta&t=x3F-TdSIUrRQrDTeCq9kz3kCwL0yfScVl7i9gFLU7GY",
//             user: {
//                 name: "Henry Klu",
//                 department: "BSc Business Analyst"
//             }
//         },
//
//         {
//             id: "10004",
//             title: "Which UX is better",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D4D22AQHtXCSrYkOZ5Q/feedshare-shrink_800/B4DZmdfZsIH4Ag-/0/1759283880311?e=1762387200&v=beta&t=OC9DmZvMyHG2pfTwM733_5-RqQqesslDdE7sZc1QM78",
//             user: {
//                 name: "Steve Jobs",
//                 department: "BSc Designer"
//             }
//         },
//
//         {
//             id: "10005",
//             title: "Business aviation summit",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D4D22AQElji8xjDbw-w/feedshare-shrink_800/B4DZYa33wjHwAk-/0/1744207577787?e=1762387200&v=beta&t=LZ6taFCYcnil4x4E9mFAutZnXmwZQwRWCL978ZhBgsg",
//             user: {
//                 name: "Peter Drew",
//                 department: "MSc Aviation & Mechanics "
//             }
//         },
//         {
//             id: "10006",
//             title: "Busy and broke",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D4D22AQGMMpvI9r9fnA/feedshare-shrink_800/B4DZl7lKvuIEAs-/0/1758714969861?e=1762387200&v=beta&t=7l1AzfyyD7QgxxcEKRMkQRKuysyFtvD65NrDrhWfx6g",
//             user: {
//                 name: "Johnny Evans",
//                 department: "BSc Statistics"
//             }
//         },
//         {
//             id: "10007",
//             title: "Differences in departments",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D5610AQHMgQHnaiWssw/image-shrink_1280/B56ZmlPE_8J4AQ-/0/1759413818006?e=1760263200&v=beta&t=HTGZsKt9bo73-zWmsxx0GQmjk4Hs5Yqd2_YCWIoaua0",
//             user: {
//                 name: "Step Adams",
//                 department: "BSc Business Admin"
//             }
//         },
//         {
//             id: "10008",
//             title: "MUN Students Dinner",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D4D22AQF9jk47EfHbZA/feedshare-shrink_800/B4DZmqkK6CH0Ag-/0/1759503242719?e=1762387200&v=beta&t=6xzKKtH5vuSjOw4TGT9psWJuxk5el6NKJ5w2I-uKjv8",
//             user: {
//                 name: "Loretta Messi",
//                 department: "BSc Computer science"
//             }
//         },
//         {
//             id: "10009",
//             title: "100+ IQ Puzzle",
//             content: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book",
//             image: "https://media.licdn.com/dms/image/v2/D4E22AQFkvfyWvl1qHQ/feedshare-shrink_800/B4EZlSwOfbHEAg-/0/1758029998602?e=1762387200&v=beta&t=kn8X1vYVa0lc-SZ65XX3BZIQPutp_jIWbIxmw5nYN2o",
//             user: {
//                 name: "Daniel Lambda",
//                 department: "MASc Artificial Intelligence"
//             }
//         },
//     ]
//
// }
//
// export async function getComments(): Promise<IComment[]> {
//     return [
//         {
//             id: "c-1",
//             message: "he looked So smug when he pulled that card 🥚",
//             user: {
//                 name: "Daniel Lambda",
//                 department: "MASc Artificial Intelligence"
//             }
//         },
//         {
//             id: "c-2",
//             message: "99+ missed calls from ZackDFilms",
//             user: {
//                 name: "Step Adams",
//                 department: "BSc Business Admin"
//             }
//         },
//         {
//             id: "c-3",
//             message: "On the bright side, he is contributing to science and giving those hungry sharks a meal.",
//             user: {
//                 name: "Steve Jobs",
//                 department: "BSc Designer"
//             }
//         },
//         {
//             id: "c-4",
//             message: "getting a you know reverse card before getting mauled to death is wild",
//             user: {
//                 name: "Peter Drew",
//                 department: "MSc Aviation & Mechanics "
//             }
//         },
//         {
//             id: "c-5",
//             message: "The baldy has very creepy smile btw",
//             user: {
//                 name: "Cyndy Matt",
//                 department: "MASc Software Engineering"
//             }
//         }