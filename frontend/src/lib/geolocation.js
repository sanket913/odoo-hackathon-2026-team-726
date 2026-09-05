// Attendance Geofence; requested only by an explicit location check-in.
export function currentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is unavailable in this browser.'))
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      error => reject(new Error(error.code === 1
        ? 'Location permission was denied. Allow location in your browser settings or use Check In without location.'
        : error.code === 3 ? 'Location request timed out. Try again outdoors or use Check In without location.'
          : 'Your location is unavailable. Check device location settings or use Check In without location.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}
