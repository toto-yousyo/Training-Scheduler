import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  LogOut,
  Settings,
  UserPlus,
  UserMinus,
} from "lucide-react";

// 初回のみ使う初期メールリスト（Firestoreにドキュメントがない場合のシード用）
const INITIAL_EMAILS = [
  "maeoka@aotsubu.co.jp",
  "karakawa@aotsubu.co.jp",
  "y.tomohiro@aotsubu.co.jp",
  "fujimoto@aotsubu.co.jp",
  "takata@aotsubu.co.jp",
  "hodai.nghr@gmail.com",
  "ho-nghr@aotsubu.co.jp",
  "m.nagahara@aotsubu.co.jp",
  "ooo1iem@gmail.com",
];

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyCEM_aX15dJ5G0lewgz8Ndowuf3w40rqFY",
  authDomain: "training-schedule-7f03b.firebaseapp.com",
  projectId: "training-schedule-7f03b",
  storageBucket: "training-schedule-7f03b.firebasestorage.app",
  messagingSenderId: "1085355066217",
  appId: "1:1085355066217:web:547ec058b7368f851533f8",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

const provider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 許可リスト（Firestoreから動的に取得）
  const [allowedEmails, setAllowedEmails] = useState(null); // null = 未ロード

  // 予定データ
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState(null);

  // カレンダーの表示月
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1));

  // 予定モーダル
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    title: "",
    type: "normal",
    description: "",
    startTime: "",
    endTime: "",
  });

  // 管理画面モーダル
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 許可リストをFirestoreからリアルタイム取得 ---
  useEffect(() => {
    if (!user) return;

    const allowlistRef = doc(db, "artifacts", appId, "config", "allowlist");

    const unsubscribe = onSnapshot(allowlistRef, async (snap) => {
      if (snap.exists()) {
        setAllowedEmails(snap.data().emails || []);
      } else {
        // 初回: 初期リストでドキュメントを作成
        await setDoc(allowlistRef, { emails: INITIAL_EMAILS });
        setAllowedEmails(INITIAL_EMAILS);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // --- 予定データをFirestoreからリアルタイム取得 ---
  useEffect(() => {
    if (!user || !allowedEmails || !allowedEmails.includes(user.email)) return;

    const collectionPath = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "training_events",
    );

    const unsubscribe = onSnapshot(
      collectionPath,
      (snapshot) => {
        setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setEventsLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("データの読み込みに失敗しました。");
        setEventsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user, allowedEmails]);

  // --- Auth Handlers ---
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Sign-in error:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setEvents([]);
    setAllowedEmails(null);
    setEventsLoading(true);
  };

  // --- 許可リスト管理 ---
  const allowlistRef = () => doc(db, "artifacts", appId, "config", "allowlist");

  const handleAddEmail = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || allowedEmails.includes(email)) return;
    setAdminSaving(true);
    try {
      await updateDoc(allowlistRef(), { emails: arrayUnion(email) });
      setNewEmail("");
    } catch (err) {
      console.error("Add email error:", err);
      alert("追加に失敗しました。");
    } finally {
      setAdminSaving(false);
    }
  };

  const handleRemoveEmail = async (email) => {
    if (!window.confirm(`${email} のアクセスを削除しますか？`)) return;
    try {
      await updateDoc(allowlistRef(), { emails: arrayRemove(email) });
    } catch (err) {
      console.error("Remove email error:", err);
      alert("削除に失敗しました。");
    }
  };

  // --- 予定 Handlers ---
  const handlePrevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );

  const handleNextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );

  const openModal = (dateStr = "", event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        date: event.date,
        title: event.title,
        type: event.type,
        description: event.description || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
      });
    } else {
      setEditingEvent(null);
      setFormData({
        date: dateStr,
        title: "",
        type: "normal",
        description: "",
        startTime: "",
        endTime: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.title || !user) return;

    const collectionPath = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "training_events",
    );
    const savingEvent = editingEvent;
    const savingFormData = { ...formData };
    closeModal();

    try {
      if (savingEvent) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "training_events",
            savingEvent.id,
          ),
          savingFormData,
        );
      } else {
        await addDoc(collectionPath, savingFormData);
      }
    } catch (err) {
      console.error("Error saving event:", err);
      alert("保存に失敗しました。");
    }
  };

  const deleteEvent = async () => {
    if (!user || !editingEvent) return;
    if (!window.confirm("この予定を削除してもよろしいですか？")) return;
    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "training_events",
          editingEvent.id,
        ),
      );
      closeModal();
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("削除に失敗しました。");
    }
  };

  const seedInitialData = async () => {
    if (!user) return;
    setEventsLoading(true);
    const collectionPath = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "training_events",
    );
    const initialData = [
      { date: "2026-05-01", title: "全体朝礼", type: "important" },
      { date: "2026-05-01", title: "通常研修", type: "normal" },
      { date: "2026-05-02", title: "通常研修", type: "normal" },
      {
        date: "2026-05-07",
        title: "メンタルサポートプログラム",
        type: "important",
      },
      { date: "2026-05-08", title: "通常研修", type: "normal" },
      {
        date: "2026-05-11",
        title: "入店研修・準備サポート",
        type: "important",
      },
      {
        date: "2026-05-12",
        title: "入店研修・準備サポート",
        type: "important",
      },
      { date: "2026-05-13", title: "通常研修", type: "normal" },
      { date: "2026-05-14", title: "通常研修", type: "normal" },
      { date: "2026-05-15", title: "通常研修", type: "normal" },
      { date: "2026-05-18", title: "通常研修", type: "normal" },
      { date: "2026-05-19", title: "通常研修", type: "normal" },
      {
        date: "2026-05-20",
        title: "合同新入社員研修(終日)",
        type: "important",
      },
      { date: "2026-05-21", title: "通常研修", type: "normal" },
      { date: "2026-05-22", title: "通常研修", type: "normal" },
      {
        date: "2026-05-23",
        title: "ラキャルプフェス・交流会",
        type: "event",
        description: "参加：久保さん、新妻さん",
      },
      {
        date: "2026-05-24",
        title: "ラキャルプフェス・交流会",
        type: "event",
        description: "参加：上野さん、金谷さん",
      },
      { date: "2026-05-25", title: "ラキャルプフェスの代休", type: "off" },
      { date: "2026-05-26", title: "出張振り返り", type: "important" },
      { date: "2026-05-27", title: "通常研修", type: "normal" },
      { date: "2026-05-28", title: "通常研修", type: "normal" },
      { date: "2026-05-29", title: "通常研修", type: "normal" },
    ];
    try {
      for (const item of initialData) await addDoc(collectionPath, item);
      setCurrentDate(new Date(2026, 4, 1));
    } catch (err) {
      console.error("Seeding error:", err);
    } finally {
      setEventsLoading(false);
    }
  };

  // --- Calendar Logic ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++)
    calendarCells.push({ type: "empty", key: `empty-${i}` });
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const dayEvents = events
      .filter((e) => e.date === dateStr)
      .sort((a, b) =>
        (a.startTime || "99:99").localeCompare(b.startTime || "99:99"),
      );
    calendarCells.push({
      type: "date",
      date: i,
      dateStr,
      events: dayEvents,
      dayOfWeek: new Date(year, month, i).getDay(),
      key: `date-${i}`,
    });
  }

  const getEventColors = (type) => {
    switch (type) {
      case "important":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "event":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "off":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-100";
    }
  };

  const getDayColors = (dayOfWeek) => {
    if (dayOfWeek === 0) return "text-red-600 bg-red-50/30";
    if (dayOfWeek === 6) return "text-blue-600 bg-blue-50/30";
    return "text-slate-800 bg-white";
  };

  // --- 画面分岐 ---

  // 認証確認中 or 許可リスト取得中
  if (authLoading || (user && allowedEmails === null)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // 未ログイン
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
          <CalendarIcon className="h-12 w-12 text-indigo-600" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-indigo-700">
              研修スケジュール
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Googleアカウントでログインしてください
            </p>
          </div>
          <button
            onClick={handleSignIn}
            className="flex items-center gap-3 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium shadow-sm hover:bg-slate-50 transition-colors w-full justify-center"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              className="h-5 w-5"
              alt="Google"
            />
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  // アクセス権なし
  if (!allowedEmails.includes(user.email)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              アクセス権がありません
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              {user.email} はアクセスが許可されていません。
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-indigo-600 hover:underline"
          >
            別のアカウントでログイン
          </button>
        </div>
      </div>
    );
  }

  if (eventsLoading && events.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            <h1 className="text-xl sm:text-2xl font-bold">
              研修スケジュール共有アプリ
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-indigo-100 hidden sm:block">
              {user.displayName}
            </span>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1 bg-white text-indigo-600 px-4 py-2 rounded-full font-medium shadow-sm hover:bg-indigo-50 transition-colors"
            >
              <Plus className="h-4 w-4" /> 予定を追加
            </button>
            <button
              onClick={() => setIsAdminOpen(true)}
              title="メンバー管理"
              className="p-2 rounded-full hover:bg-indigo-700 transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={handleSignOut}
              title="ログアウト"
              className="p-2 rounded-full hover:bg-indigo-700 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3 rounded-r-md">
            <AlertCircle className="text-red-500 h-5 w-5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 毎日の基本ルーティン */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            毎日の基本ルーティン
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { time: "8:50", title: "朝礼", sub: "10分間" },
              { time: "9:00", title: "日報・連絡事項", sub: "〜10:00" },
              {
                time: "お昼",
                title: "休憩（1時間）",
                sub: "※研修内容により変動",
              },
              { time: "17:00", title: "日報作成", sub: "〜17:30" },
              { time: "17:30", title: "復習まとめ", sub: "〜17:45" },
            ].map(({ time, title, sub }) => (
              <div
                key={time}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <span className="font-bold text-indigo-600 w-14 shrink-0 text-right">
                  {time}
                </span>
                <div>
                  <p className="font-semibold text-slate-700">{title}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <span className="font-bold text-indigo-600 w-14 shrink-0 text-right">
                隔週1回
              </span>
              <div>
                <p className="font-semibold text-indigo-800">メンター 1on1</p>
                <p className="text-xs text-indigo-600">30分～1時間程度</p>
              </div>
            </div>
          </div>
        </section>

        {/* カレンダー */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">
              {year}年 {month + 1}月
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {events.length === 0 && !eventsLoading && (
            <div className="p-8 text-center bg-yellow-50 border-b border-yellow-100">
              <p className="mb-4 text-yellow-800">
                まだ予定が登録されていません。
              </p>
              <button
                onClick={seedInitialData}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-medium transition-colors text-sm shadow-sm"
              >
                2026年5月の初期データを読み込む
              </button>
            </div>
          )}

          <div className="flex flex-col md:grid md:grid-cols-7 gap-[1px] bg-slate-200">
            {weekDays.map((wd, i) => (
              <div
                key={wd}
                className={`hidden md:block py-2 text-center text-sm font-bold bg-slate-100 ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-slate-600"}`}
              >
                {wd}
              </div>
            ))}

            {calendarCells.map((cell) => {
              if (cell.type === "empty")
                return (
                  <div
                    key={cell.key}
                    className="hidden md:block bg-slate-50 min-h-[120px]"
                  />
                );
              const { date, dateStr, events: dayEvents, dayOfWeek } = cell;
              return (
                <div
                  key={cell.key}
                  className={`relative p-2 flex flex-col border-b md:border-none border-slate-100 ${getDayColors(dayOfWeek)} md:min-h-[120px] transition-colors hover:bg-slate-50 group cursor-pointer`}
                  onClick={() => openModal(dateStr)}
                >
                  <div className="flex items-center justify-between md:mb-1">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-bold text-lg md:text-base ${dayOfWeek === 0 ? "text-red-600" : dayOfWeek === 6 ? "text-blue-600" : "text-slate-800"}`}
                      >
                        {date}
                      </span>
                      <span className="md:hidden text-xs font-medium text-slate-500">
                        {weekDays[dayOfWeek]}曜
                      </span>
                    </div>
                    <button
                      className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-all"
                      title="予定を追加"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button className="md:hidden text-indigo-600 p-1">
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 md:mt-0 flex-1 flex flex-col gap-1.5">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(dateStr, ev);
                        }}
                        className={`p-1.5 rounded border text-xs md:text-sm leading-tight shadow-sm hover:shadow transition-shadow cursor-pointer ${getEventColors(ev.type)}`}
                      >
                        {ev.startTime && (
                          <div className="text-[10px] md:text-xs opacity-70 flex items-center gap-0.5 mb-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {ev.startTime}
                            {ev.endTime ? `〜${ev.endTime}` : ""}
                          </div>
                        )}
                        <div className="font-semibold">{ev.title}</div>
                        {ev.description && (
                          <div className="mt-1 text-[10px] md:text-xs opacity-80 border-t border-current pt-1">
                            {ev.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* 予定 追加/編集モーダル */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {editingEvent ? "予定を編集" : "予定を追加"}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  日付
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：通常研修、新入社員歓迎会"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  種類
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="normal">通常研修 (青)</option>
                  <option value="important">重要な予定/研修 (黄)</option>
                  <option value="event">イベント/行事 (ピンク)</option>
                  <option value="off">休日/代休 (緑)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  時間（任意）
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-500 text-sm shrink-0">〜</span>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  メモ・詳細（任意）
                </label>
                <textarea
                  rows="3"
                  placeholder="参加者や持ち物など"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={deleteEvent}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" /> 削除
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* メンバー管理モーダル */}
      {isAdminOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsAdminOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-500" /> メンバー管理
              </h3>
              <button
                onClick={() => setIsAdminOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* メール追加フォーム */}
              <form onSubmit={handleAddEmail} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="追加するメールアドレス"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={adminSaving}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" /> 追加
                </button>
              </form>

              {/* 現在の許可リスト */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">
                  アクセス許可中 ({allowedEmails.length}名)
                </p>
                <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                  {allowedEmails.map((email) => (
                    <li
                      key={email}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm"
                    >
                      <span
                        className={`text-slate-700 truncate ${email === user.email ? "font-semibold" : ""}`}
                      >
                        {email}{" "}
                        {email === user.email && (
                          <span className="text-xs text-indigo-500 ml-1">
                            （自分）
                          </span>
                        )}
                      </span>
                      {email !== user.email && (
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="ml-2 shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                          title="削除"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
