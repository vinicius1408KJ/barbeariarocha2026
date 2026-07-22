import type { SVGProps } from "react"

export function RazorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M10 40c26-6 52-8 76-2 4 1 8 3 8 3s-4 2-8 3c-24 6-50 4-76-2z"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <circle cx="96" cy="41" r="5" stroke="currentColor" strokeWidth={2.5} />
      <path
        d="M100 38c22-14 48-22 70-18 8 2 14 6 16 11-10 6-24 8-40 6-18-2-34-6-46 1z"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.12}
      />
    </svg>
  )
}
