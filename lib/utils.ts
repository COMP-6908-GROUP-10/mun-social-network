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

  return queryName;
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