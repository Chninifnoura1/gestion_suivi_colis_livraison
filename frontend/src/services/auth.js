
const sameOriginApi = import.meta.env.VITE_SAME_ORIGIN_API === "1";
const AUTH_URL = sameOriginApi ? "" : "http://localhost:8001";

export class AuthError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${AUTH_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new AuthError(
      "Impossible de contacter le serveur. Vérifiez que le service Auth est démarré."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AuthError(
      data.detail || "Une erreur est survenue.",
      response.status
    );
  }

  return data;
}

export async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(token) {
  return request("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export async function listAgencies(token) {
  return request("/auth/agencies", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export async function listActiveAgencyCities(token) {
  return request("/auth/active-agency-cities", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function listActiveAgencies(token) {
  return request("/auth/active-agencies", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createAdmin(token, payload) {
  return request("/auth/admins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function createCourier(token, payload) {
  return request("/auth/couriers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
export async function listCouriers(token) {
  return request("/auth/couriers", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export async function updateCourier(token, id, payload) {
  return request(`/auth/couriers/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
export async function listAdmins(token) {
  return request("/auth/admins", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export async function updateAdmin(token, id, payload) {
  return request(`/auth/admins/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
export async function createAgency(token, payload) {
  return request("/auth/agencies", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}