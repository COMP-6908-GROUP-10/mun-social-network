import { clsx, type ClassValue } from "clsx"
import { toast } from "sonner";
import { twMerge } from "tailwind-merge"
import {AxiosError} from "axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const axiosErrorHandler = (error: Error) => {
  const axiosError = error as AxiosError<{ message: string }>;
  toast.error(axiosError.response?.data?.message || "Sorry! connection failed")
}