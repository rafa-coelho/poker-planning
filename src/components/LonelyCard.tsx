"use client";

import React from "react";

interface Participant {
  userId: string;
  userName: string;
  selectedCard: string | null;
}

export default function LonelyCard({ participants }: { participants: Participant[] }) {
  if (participants.length > 1) return null;
  return (
    <div className="text-center text-gray-500 mb-6">
      <p className="mb-1 text-lg">
        Feeling lonely? <span>🥱</span>
      </p>
      <button className="text-blue-500 hover:underline">
        Invite players
      </button>
    </div>
  );
}
