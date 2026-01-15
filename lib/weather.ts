export async function getWeatherData() {
  try {
    // API Call to Meteosource for Formosa (added daily section)
    const res = await fetch("https://www.meteosource.com/api/v1/free/point?place_id=formosa&sections=current,daily&timezone=America%2FArgentina%2FCordoba&language=en&units=metric&key=8rtfamywjmn2vw3py9aqf9cncld52wm2l36b7e02", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) throw new Error("Failed to fetch weather data");

    return await res.json();
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}
