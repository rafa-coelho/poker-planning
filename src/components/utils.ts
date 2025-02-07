import { Participant } from "./useSession";

export function ensureLocalUser (participants: Participant[], localUserId: string, localUserName: string): Participant[] {
  const exists = participants.some(p => p.userId === localUserId);
  if (!exists && localUserId && localUserName) {
    return [
      ...participants,
      { userId: localUserId, userName: localUserName, selectedCard: null, isCurrentUser: true },
    ];
  }
  return participants;
}

export function distributeParticipants (all: Participant[]) {
  const topParticipants: Participant[] = [];
  const leftParticipants: Participant[] = [];
  const rightParticipants: Participant[] = [];
  const bottomParticipants: Participant[] = [];

  const total = all.length;

  if (total === 1) {
    topParticipants.push(all[0]);
  } else if (total === 2) {
    topParticipants.push(all[0]);
    bottomParticipants.push(all[1]);
  } else if (total === 3) {
    topParticipants.push(all[0]);
    leftParticipants.push(all[1]);
    bottomParticipants.push(all[2]);
  } else if (total === 4) {
    topParticipants.push(all[0], all[1]);
    rightParticipants.push(all[2]);
    bottomParticipants.push(all[3]);
  } else {
    const half = Math.ceil(total / 2);
    topParticipants.push(...all.slice(0, Math.ceil(half / 2)));
    bottomParticipants.push(...all.slice(Math.ceil(half / 2), half));

    for (let i = half; i < total; i++) {
      (i % 2 === 0 ? leftParticipants : rightParticipants).push(all[i]);
    }
  }

  return { topParticipants, leftParticipants, rightParticipants, bottomParticipants };
}


/*


function ensureLocalUser (
  participants: Participant[],
  localUserId: string,
  localUserName: string
): Participant[] {
  const exists = participants.some(p => p.userId === localUserId);
  if (!exists && localUserId && localUserName) {
    return [
      ...participants,
      { userId: localUserId, userName: localUserName, selectedCard: null },
    ];
  }
  return participants;
}

function distributeParticipants(all: Participant[]) {
  const topParticipants: Participant[] = [];
  const leftParticipants: Participant[] = [];
  const rightParticipants: Participant[] = [];
  const bottomParticipants: Participant[] = [];

  const total = all.length;

  if (total === 1) {
    topParticipants.push(all[0]);
  } else if (total === 2) {
    topParticipants.push(all[0]);
    bottomParticipants.push(all[1]);
  } else if (total === 3) {
    topParticipants.push(all[0]);
    leftParticipants.push(all[1]);
    bottomParticipants.push(all[2]);
  } else if (total === 4) {
    topParticipants.push(all[0], all[1]);
    rightParticipants.push(all[2]);
    bottomParticipants.push(all[3]);
  } else {
    const half = Math.ceil(total / 2);
    topParticipants.push(...all.slice(0, Math.ceil(half / 2)));
    bottomParticipants.push(...all.slice(Math.ceil(half / 2), half));

    for (let i = half; i < total; i++) {
      (i % 2 === 0 ? leftParticipants : rightParticipants).push(all[i]);
    }
  }

  return { topParticipants, leftParticipants, rightParticipants, bottomParticipants };
}


*/
