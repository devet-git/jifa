"use client";

import { createContext, useContext } from "react";

interface ProjectFormat {
  dateFormat: string;
  timeFormat: string;
}

const ProjectFormatContext = createContext<ProjectFormat>({
  dateFormat: "MMM DD, YYYY",
  timeFormat: "h:mm A",
});

export function useProjectFormat() {
  return useContext(ProjectFormatContext);
}

export function ProjectFormatProvider({
  dateFormat,
  timeFormat,
  children,
}: {
  dateFormat?: string | null;
  timeFormat?: string | null;
  children: React.ReactNode;
}) {
  return (
    <ProjectFormatContext.Provider
      value={{
        dateFormat: dateFormat || "MMM DD, YYYY",
        timeFormat: timeFormat || "h:mm A",
      }}
    >
      {children}
    </ProjectFormatContext.Provider>
  );
}
