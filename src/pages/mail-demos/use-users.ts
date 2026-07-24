import { useEffect, useState } from "react";
import { mailApi } from "@/extensions/nocobase-mail";
import type { MailUserRecord } from "@/extensions/nocobase-mail";

export function useUsers() {
  const [users, setUsers] = useState<MailUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    mailApi
      .getUsers()
      .then((list) => active && setUsers(list))
      .catch(() => active && setUsers([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { users, loading };
}

export function userDisplayName(user: MailUserRecord) {
  return user.nickname || user.username || user.email || `User #${user.id}`;
}

export function userInitials(user: MailUserRecord) {
  const name = userDisplayName(user);
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
