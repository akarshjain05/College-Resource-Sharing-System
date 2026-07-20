import { useState, useMemo } from "react";
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isWithinInterval, 
  addMonths, 
  subMonths,
  format,
  isSameDay,
  isBefore,
  startOfDay,
  differenceInCalendarDays
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AvailabilityCalendar({ bookings = [], selectedRange, onSelectRange, maxDays }) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  }, [currentMonth]);

  // Determine if a day is booked
  const isBooked = (day) => {
    return bookings.some(b => 
      isWithinInterval(day, { start: startOfDay(new Date(b.start)), end: startOfDay(new Date(b.end)) })
    );
  };

  // Check if a range has any booked days inside it
  const hasBookingInRange = (start, end) => {
    const rangeDays = eachDayOfInterval({ start, end });
    return rangeDays.some(d => isBooked(d));
  };

  const handleDayClick = (day) => {
    if (isBefore(day, today) || isBooked(day)) return;

    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      // Start a new selection
      onSelectRange({ start: day, end: null, error: null });
    } else {
      // Complete the selection
      if (isBefore(day, selectedRange.start)) {
        onSelectRange({ start: day, end: null, error: null });
        return;
      }
      
      const duration = differenceInCalendarDays(day, selectedRange.start) + 1;
      
      if (maxDays && duration > maxDays) {
        onSelectRange({ ...selectedRange, error: `Maximum borrow period is ${maxDays} days` });
        return;
      }
      
      if (hasBookingInRange(selectedRange.start, day)) {
        onSelectRange({ ...selectedRange, error: "Selected range overlaps with existing bookings" });
        return;
      }

      onSelectRange({ start: selectedRange.start, end: day, error: null });
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            disabled={isBefore(currentMonth, startOfMonth(today))}
            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded-md hover:bg-slate-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-xs font-semibold text-slate-400">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Padding for first day of month */}
        {Array.from({ length: days[0].getDay() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        
        {days.map(day => {
          const booked = isBooked(day);
          const past = isBefore(day, today);
          const isSelectedStart = selectedRange.start && isSameDay(day, selectedRange.start);
          const isSelectedEnd = selectedRange.end && isSameDay(day, selectedRange.end);
          const isWithinSelection = selectedRange.start && selectedRange.end && 
                                   isWithinInterval(day, { start: selectedRange.start, end: selectedRange.end });
          const isToday = isSameDay(day, today);

          let className = "relative flex h-9 items-center justify-center rounded-lg text-sm transition-all focus:outline-none ";
          
          if (past) {
            className += "text-slate-300 cursor-not-allowed ";
          } else if (booked) {
            className += "bg-red-50 text-red-300 cursor-not-allowed line-through ";
          } else if (isSelectedStart || isSelectedEnd) {
            className += "bg-primary-600 text-white font-bold ";
          } else if (isWithinSelection) {
            className += "bg-primary-50 text-primary-700 font-medium ";
          } else {
            className += "text-slate-700 hover:bg-slate-100 cursor-pointer ";
          }

          if (isToday && !isSelectedStart && !isSelectedEnd) {
            className += "ring-1 ring-inset ring-slate-200 ";
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={past || booked}
              onClick={() => handleDayClick(day)}
              className={className}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      
      {selectedRange.error && (
        <p className="text-xs text-red-500 mt-3 font-medium flex items-center justify-center">
          {selectedRange.error}
        </p>
      )}
    </div>
  );
}
