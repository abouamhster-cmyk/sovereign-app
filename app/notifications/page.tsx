// app/notifications/page.tsx
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  async function fetchNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    setNotifications(data || []);
  }
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-serif text-gold-500 mb-4">Notifications</h1>
      <div className="space-y-3">
        {notifications.map((notif) => (
          <div key={notif.id} className="bg-white/5 rounded-xl p-4">
            <p className="text-ivory">{notif.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(notif.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
