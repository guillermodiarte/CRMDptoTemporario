export async function getDollarRate(): Promise<number> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/oficial", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!res.ok) throw new Error("Failed to fetch dollar rate");
    const data = await res.json();
    return data.compra; // Return "compra" value as requested
  } catch (error) {
    console.error("Error fetching dollar rate:", error);
    return 0; // Fallback or handle error downstream
  }
}

export async function getFullDollarData() {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Failed to fetch dollar rate");
    return await res.json();
  } catch (error) {
    console.error("Error fetching dollar rate:", error);
    return null;
  }
}
