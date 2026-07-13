import type { InboxThread } from "./types";

export const demoInboxThreads: InboxThread[] = [
  {
    id: "thread-proposal-742",
    subject: "Proposal 742 | security patrol coverage",
    preview: "Client approved scope. Waiting on operator confirmation for overnight staffing.",
    status: "awaiting_reply",
    team: "Field Ops",
    unreadCount: 3,
    priorityLabel: "Urgent",
    updatedAtLabel: "2m ago",
    nextStep: "Confirm two overnight officers and send revised ETA before 4:30 PM.",
    participants: [
      { id: "p-1", name: "Maya Chen", role: "client" },
      { id: "p-2", name: "Derrick Ross", role: "operator" },
      { id: "p-3", name: "Atlas Agent", role: "agent" },
    ],
    messages: [
      {
        id: "m-1",
        author: { id: "p-3", name: "Atlas Agent", role: "agent" },
        body: "Drafted a staffing response and highlighted the coverage gap on the west entrance post.",
        sentAtLabel: "4:04 PM",
      },
      {
        id: "m-2",
        author: { id: "p-1", name: "Maya Chen", role: "client" },
        body: "If SISG can confirm the overnight shift today, we will release the addendum tonight.",
        sentAtLabel: "4:09 PM",
        tone: "caution",
      },
      {
        id: "m-3",
        author: { id: "p-2", name: "Derrick Ross", role: "operator" },
        body: "Reviewing available roster now. I will send a final headcount shortly.",
        sentAtLabel: "4:11 PM",
      },
    ],
  },
  {
    id: "thread-hq-access",
    subject: "HQ visitor access audit",
    preview: "Agent summary is ready with badge anomalies grouped by floor and shift.",
    status: "live",
    team: "Compliance",
    unreadCount: 1,
    priorityLabel: "High signal",
    updatedAtLabel: "9m ago",
    nextStep: "Approve the outbound summary and attach the PDF export.",
    participants: [
      { id: "p-4", name: "Nina Patel", role: "client" },
      { id: "p-5", name: "Jules Hart", role: "operator" },
      { id: "p-6", name: "Watchtower", role: "agent" },
    ],
    messages: [
      {
        id: "m-4",
        author: { id: "p-6", name: "Watchtower", role: "agent" },
        body: "Found seven visitor badges still active after checkout. Export is ready for review.",
        sentAtLabel: "3:42 PM",
        tone: "positive",
      },
      {
        id: "m-5",
        author: { id: "p-4", name: "Nina Patel", role: "client" },
        body: "Please send the floor breakdown before tomorrow's board briefing.",
        sentAtLabel: "3:48 PM",
      },
    ],
  },
  {
    id: "thread-shift-recap",
    subject: "Weekend event shift recap",
    preview: "Post-event incident recap was delivered. No further action required unless billing changes.",
    status: "resolved",
    team: "Events",
    unreadCount: 0,
    priorityLabel: "Closed loop",
    updatedAtLabel: "1h ago",
    nextStep: "Archive after invoice sync completes.",
    participants: [
      { id: "p-7", name: "Ari Gomez", role: "client" },
      { id: "p-8", name: "Lane Ortiz", role: "operator" },
    ],
    messages: [
      {
        id: "m-6",
        author: { id: "p-8", name: "Lane Ortiz", role: "operator" },
        body: "Recap delivered with timeline, staffing notes, and one medical assist entry.",
        sentAtLabel: "2:17 PM",
      },
    ],
  },
];
