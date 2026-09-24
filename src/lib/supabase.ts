export const SUPABASE_URL = "https://cosgdemnojcyhlbvcbwh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvc2dkZW1ub2pjeWhsYnZjYndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNDE4MzksImV4cCI6MjEwNTcxNzgzOX0.KOH8S_L7JT7X6eM9lPKe4xE4Id_zWtXM2cde6tvomUI";

const headers = {
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

export const supabase = {
  from: (table: string) => ({
    insert: async (data: any) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    select: async (query: string = "*") => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${query}`, {
        method: "GET",
        headers
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    eq: (column: string, value: string, selectQuery: string = "*"): any => {
      // Allow chaining a GET, DELETE, or PATCH
      const baseObj = {
        then: (resolve: any, reject: any) => {
          // If awaited directly, do a GET
          fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${selectQuery}`, {
            method: "GET",
            headers
          }).then(res => {
            if (!res.ok) res.text().then(reject);
            else res.json().then(resolve);
          }).catch(reject);
        },
        delete: async () => {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
            method: "DELETE",
            headers: { ...headers, "Prefer": "return=minimal" }
          });
          if (!res.ok) throw new Error(await res.text());
          return true;
        },
        update: async (data: any) => {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
            method: "PATCH",
            headers: { ...headers, "Prefer": "return=minimal" },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error(await res.text());
          return true;
        }
      };
      
      return baseObj as any;
    }
  })
};
