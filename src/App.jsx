import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
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
} from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Users,
  BookOpen,
  AlertCircle,
} from "lucide-react";

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

export default function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // カレンダーの表示月管理（初期は2026年5月）
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1));

  // モーダル管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    title: "",
    type: "normal",
    description: "",
  });

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError("認証に失敗しました。");
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

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
        const fetchedEvents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(fetchedEvents);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("データの読み込みに失敗しました。");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // --- Handlers ---
  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const openModal = (dateStr = "", event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        date: event.date,
        title: event.title,
        type: event.type,
        description: event.description || "",
      });
    } else {
      setEditingEvent(null);
      setFormData({
        date: dateStr,
        title: "",
        type: "normal",
        description: "",
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
    console.log("saveEvent called, user:", user, "formData:", formData);
    if (!formData.date || !formData.title) return;
    if (!user) {
      alert("認証が完了していません。しばらく待ってから再試行してください。");
      return;
    }

    const collectionPath = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "training_events",
    );

    try {
      if (editingEvent) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "training_events",
            editingEvent.id,
          ),
          formData,
        );
      } else {
        await addDoc(collectionPath, formData);
      }
    } catch (err) {
      console.error("Error saving event:", err);
      alert("保存に失敗しました。");
    } finally {
      console.log("finally: closing modal");
      closeModal();
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

  // --- Helper: Seed Initial Data ---
  const seedInitialData = async () => {
    if (!user) return;
    setLoading(true);
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
      for (const item of initialData) {
        await addDoc(collectionPath, item);
      }
      setCurrentDate(new Date(2026, 4, 1)); // 2026年5月に移動
    } catch (err) {
      console.error("Seeding error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Calendar Logic ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)

  const calendarCells = [];
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  // 前月の余白
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push({ type: "empty", key: `empty-${i}` });
  }

  // 今月の日付
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const dayEvents = events.filter((e) => e.date === dateStr);
    const dayOfWeek = new Date(year, month, i).getDay();
    calendarCells.push({
      type: "date",
      date: i,
      dateStr,
      events: dayEvents,
      dayOfWeek,
      key: `date-${i}`,
    });
  }

  // カレンダー描画用ヘルパー
  const getEventColors = (type) => {
    switch (type) {
      case "important":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "event":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "off":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-100"; // normal
    }
  };

  const getDayColors = (dayOfWeek) => {
    if (dayOfWeek === 0) return "text-red-600 bg-red-50/30";
    if (dayOfWeek === 6) return "text-blue-600 bg-blue-50/30";
    return "text-slate-800 bg-white";
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header Bar */}
      <header className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            <h1 className="text-xl sm:text-2xl font-bold">
              研修スケジュール共有アプリ
            </h1>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1 bg-white text-indigo-600 px-4 py-2 rounded-full font-medium shadow-sm hover:bg-indigo-50 transition-colors"
          >
            <Plus className="h-4 w-4" /> 予定を追加
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Message */}
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
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-indigo-600 w-14 shrink-0 text-right">
                8:50
              </span>
              <div>
                <p className="font-semibold text-slate-700">朝礼</p>
                <p className="text-xs text-slate-500">10分間</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-indigo-600 w-14 shrink-0 text-right">
                9:00
              </span>
              <div>
                <p className="font-semibold text-slate-700">日報・連絡事項</p>
                <p className="text-xs text-slate-500">〜10:00</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-indigo-600 w-14 shrink-0 text-right">
                お昼
              </span>
              <div>
                <p className="font-semibold text-slate-700">休憩（1時間）</p>
                <p className="text-xs text-slate-500">※研修内容により変動</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-indigo-600 w-14 shrink-0 text-right">
                17:00
              </span>
              <div>
                <p className="font-semibold text-slate-700">日報作成</p>
                <p className="text-xs text-slate-500">〜17:30</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-indigo-600 w-14 shrink-0 text-right">
                17:30
              </span>
              <div>
                <p className="font-semibold text-slate-700">復習まとめ</p>
                <p className="text-xs text-slate-500">〜17:45</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <span className="font-bold text-indigo-600 w-14 shrink-0 text-right">
                週1回
              </span>
              <div>
                <p className="font-semibold text-indigo-800">メンター 1on1</p>
                <p className="text-xs text-indigo-600">30分～1時間程度</p>
              </div>
            </div>
          </div>
        </section>

        {/* カレンダーコントロール */}
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

          {events.length === 0 && !loading && (
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

          {/* カレンダーグリッド (PC) / リスト (スマホ) */}
          <div className="flex flex-col md:grid md:grid-cols-7 gap-[1px] bg-slate-200">
            {/* 曜日ヘッダー (PCのみ) */}
            {weekDays.map((wd, i) => (
              <div
                key={wd}
                className={`hidden md:block py-2 text-center text-sm font-bold bg-slate-100 ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-slate-600"}`}
              >
                {wd}
              </div>
            ))}

            {/* カレンダーセル */}
            {calendarCells.map((cell) => {
              if (cell.type === "empty") {
                return (
                  <div
                    key={cell.key}
                    className="hidden md:block bg-slate-50 min-h-[120px]"
                  ></div>
                );
              }

              const { date, dateStr, events, dayOfWeek } = cell;
              const hasEvents = events.length > 0;

              // スマホでは予定がない日は非表示にする（少しスッキリさせるため）か、全て表示するか
              // 今回は研修スケジュールなので全て表示するが、高さは抑える
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
                    {/* PCホバー時の追加ボタン */}
                    <button
                      className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-all"
                      title="予定を追加"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    {/* スマホ用追加ボタン */}
                    <button className="md:hidden text-indigo-600 p-1">
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-2 md:mt-0 flex-1 flex flex-col gap-1.5">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(dateStr, ev);
                        }}
                        className={`p-1.5 rounded border text-xs md:text-sm leading-tight shadow-sm hover:shadow transition-shadow cursor-pointer ${getEventColors(ev.type)}`}
                      >
                        <div className="font-semibold">{ev.title}</div>
                        {ev.description && (
                          <div className="mt-1 text-[10px] md:text-xs opacity-80 border-t border-current pt-1 mt-1">
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

      {/* 編集・追加モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={closeModal}>
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
                  メモ・詳細（任意）
                </label>
                <textarea
                  rows="3"
                  placeholder="参加者や持ち物、詳細な時間など"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                ></textarea>
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
                  <div></div> // spacer
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
    </div>
  );
}
