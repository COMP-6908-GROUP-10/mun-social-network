import { clsx, type ClassValue } from "clsx"
import { toast } from "sonner";
import { twMerge } from "tailwind-merge"
import {AxiosError} from "axios";
import {v4 as uuidv4} from 'uuid';
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const axiosErrorHandler = (error: Error) => {
  const axiosError = error as AxiosError<{ message: string }>;
  toast.error(axiosError.response?.data?.message || "Sorry! connection failed", {
    position: "top-center"
  })
}

export function getUuid(): string {
  return uuidv4()
}

export function quickFormatDate(date?: Date | string) {
  if(!date) {
    return date
  }
  return format(date, "LLL dd, y")
}

export function quickFormatDateTime(date?: Date | string) {
  if(!date) {
    return date
  }
  return format(date, "LLL dd, y h:mm a")
}

export function getActivityNameByQueryName(queryName: string): string {

  if (queryName == "fetch_posts") {
    return "Fetch Posts [ count likes, comments ]"
  }else if (queryName == "create_users") {
    return "Generate Users"
  }
  else if (queryName == "create_posts") {
    return "Generate Posts"
  }
  else if (queryName == "create_comments") {
    return "Generate Comments"
  }
  else if (queryName == "fetch_comments" || queryName == "fetch_comments_recursive") {
    return "Fetch Comments Recursively"
  }
  else if (queryName == "fetch_likes") {
    return "Fetch Likes"
  }
  else if (queryName == "fetch_followers") {
    return "Fetch Followers"
  }
  else if (queryName == "fetch_following") {
    return "Fetch Following"
  }
  else if (queryName == "create_likes") {
    return "Generate Likes"
  }
  else if (queryName == "create_followers") {
    return "Generate Followers"
  }
  else if (queryName == "create_following") {
    return "Generate Following"
  }

  return queryName
}

export function getDeveloperEffortRemarks(queryName: string): string {
  if (queryName === "fetch_posts") {
    return "This required a fair amount of work. Writing the SQL joins and pagination logic took some effort, and the Cypher version needed careful MATCH patterns to get the structure right.";
  }
  else if (queryName === "create_users") {
    return "This was straightforward. Both the SQL INSERT and the Cypher MERGE were simple to implement with very little complexity.";
  }
  else if (queryName === "create_posts") {
    return "This was relatively easy. The SQL insert was simple, and although the Cypher version needed relationship creation, it was still easy to manage.";
  }
  else if (queryName === "create_comments") {
    return "This took a moderate amount of effort. SQL needed proper handling of parent and child comment relationships, and Cypher required clear MERGE patterns to connect the nodes correctly.";
  }
  else if (queryName === "fetch_comments" || queryName === "fetch_comments_recursive") {
    return "This was the most challenging task. SQL recursion for nested comments was quite involving, and the Cypher version needed careful variable depth traversal to avoid unnecessary complexity.";
  }
  else if (queryName === "fetch_likes") {
    return "This was relatively straightforward. In SQL, it involved filtering and counting likes using indexed foreign keys, while in Cypher the relationship traversal made the query concise and easy to express.";
  }
  else if (queryName === "fetch_followers") {
    return "This required moderate effort. SQL needed self-joins on the followers table to retrieve the correct user relationships, whereas Cypher naturally modeled this through direct relationship traversal.";
  }
  else if (queryName === "fetch_following") {
    return "This was similar in complexity to fetching followers. SQL relied on join conditions to distinguish directionality, while Cypher made the intent clearer by following outgoing relationship patterns.";
  }

  return queryName;
}

export function getFindings(queryName: string): string {
  if (queryName == "fetch_posts") {
    return `
      For "fetching posts with likes and comment counts", the key difference is that SQL handles this pattern more efficiently as scale increases. 
      SQL benefits from direct joins and aggregate functions, which are well-optimized for counting related records like likes and comments. 
      The graph database performs the same task through relationship traversal, which adds unnecessary overhead for what is essentially a flat aggregation problem. 
      As data size grows, this extra traversal work makes the graph approach slightly less efficient compared to SQL. In practice, SQL is the better choice when the task is counting or aggregating related data rather than navigating deep relationships.
    `
  }
  else if (queryName === "fetch_comments" || queryName === "fetch_comments_recursive") {
    return `
    For "recursive comment fetching", SQL slows down much more quickly. At small data scales, the performance difference is minor and SQL handles the recursion reasonably well. 
    As the dataset becomes larger, SQL’s recursive joins introduce significant overhead and higher latency. 
    The graph database remains more stable because recursive traversal is a natural operation in a graph model. 
    In practice, graph databases are the better choice once deep or recursive comment hierarchies are involved.
    `;
  }
  else if (queryName == "fetch_likes") {
      return `
        For "fetching likes", SQL consistently outperforms the graph database, showing lower latency across all tested data scales. 
        This is because the operation is a simple count and filter on indexed foreign keys, which relational databases handle very efficiently. 
        The graph approach, while concise and expressive, introduces additional overhead through relationship traversal that is unnecessary for this kind of flat lookup. As the dataset grows, this overhead becomes more visible, keeping graph latency slightly higher than SQL. In practice, SQL is the better choice for fetching likes when the operation does not require multi-hop relationship exploration
      `
  }
  else if (queryName == "fetch_followers") {
    return `
      For "fetching followers", SQL is faster: it consistently records lower latency (ms) than the graph approach across the tested scales, indicating higher performance. 
      The one-hop “who follows this user?” pattern maps cleanly to an indexed join on a followers table, which SQL optimizes well. 
      The graph database pays extra overhead for relationship traversal here and doesn’t gain an advantage on this flat lookup. 
      In practice, use SQL for single-hop follower lists; consider graph only when the query expands to multi-hop discovery (e.g., followers-of-followers) or path-based logic
    `
  }
  else if (queryName == "fetch_following") {
    return `
      For fetching following, SQL again shows better performance than the graph database, with consistently lower latency across all tested data scales. 
      The query maps cleanly to indexed joins that SQL can execute efficiently, even as the dataset grows. 
      The graph approach relies on outgoing relationship traversal, which makes the query intent clearer but adds extra overhead for what is still a single-hop lookup. 
      As scale increases, this overhead keeps graph latency slightly higher than SQL. In practice, SQL is the better choice for fetching following lists unless the query expands into deeper, multi-hop relationship exploration.
    `
  }

  return 'N/A'

}


export function formatCountToSocial(num?: number): string {
  if (num === undefined) {
    return ""
  }

  if (num < 1000) return String(num);

  if (num < 1_000_000) {
    return (num / 1000).toFixed(num < 10_000 ? 1 : 0) + "K";
  }

  if (num < 1_000_000_000) {
    return (num / 1_000_000).toFixed(num < 10_000_000 ? 1 : 0) + "M";
  }

  return (num / 1_000_000_000).toFixed(num < 10_000_000_000 ? 1 : 0) + "B";
}

export function capitalize(text?: string | null): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

