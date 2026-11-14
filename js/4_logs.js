class FlightLogController {
  constructor(stats) {
    this.stats = stats;
    if (!localStorage.getItem("galaxtar_logs")) {
      localStorage.setItem("galaxtar_logs", JSON.stringify([]));
    }
  }
  getLogs() {
    try { return JSON.parse(localStorage.getItem("galaxtar_logs")) || []; }
    catch(e) { return []; }
  }
  generateFlightLog(flightData) {
    const logs = this.getLogs();
    const index = logs.length;
    if (index < GALAXTAR_DATA.storyLogs.length) {
      logs.push({
        id: index,
        text: GALAXTAR_DATA.storyLogs[index],
        date: new Date().toLocaleDateString(),
        unread: true,
        distance: flightData.distance
      });
      localStorage.setItem("galaxtar_logs", JSON.stringify(logs));
    }
  }
  hasUnread() {
    return this.getLogs().some(l => l.unread);
  }
  markAllRead() {
    const logs = this.getLogs();
    logs.forEach(l => l.unread = false);
    localStorage.setItem("galaxtar_logs", JSON.stringify(logs));
  }
}
