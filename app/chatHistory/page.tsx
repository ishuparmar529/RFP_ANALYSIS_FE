"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getHistory } from "@/lib/APIservice";

export default function ChatHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState("today");
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedChats, setExpandedChats] = useState({}); // State to track expanded responses

  const { data: chatData, isLoading: chatLoading, error: chatError } = useQuery({ 
    queryKey: ['chatHistory', { filter, startDate, endDate }],
    queryFn: () => getHistory({ filter, startDate, endDate }),
  });

  // Toggle the expanded state of a specific chat
  const toggleChat = (chatId) => {
    setExpandedChats((prev) => ({
      ...prev,
      [chatId]: !prev[chatId],
    }));
  };

  return (
    <div className="flex h-screen bg-gray-100 relative overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="flex-1 overflow-auto w-full">
        <div className="max-w-5xl mx-auto bg-white min-h-full shadow-sm">
          <Header setSidebarOpen={setSidebarOpen} sidebarOpen={sidebarOpen} />

          <div className="p-6 space-y-6">
            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Dates</SelectItem>
                </SelectContent>
              </Select>

              {filter === "custom" && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Chat History Display */}
            {chatLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : chatData?.result.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No chat history found for the selected period
              </div>
            ) : (
              <div className="space-y-6">
                {chatData?.result?.map((chat) => (
                  <Card key={chat.id} className="hover:shadow-md transition-shadow">
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => toggleChat(chat.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-800">
                           Project : {chat.project_name}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            {chat.created_at
                              ? format(new Date(chat.created_at), "PPPp")
                              : "Date not available"}
                          </p>
                        </div>
                        {expandedChats[chat.id] ? (
                          <ChevronUp className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <p className="text-gray-600 mt-2">{chat.message}</p>
                    </CardHeader>
                    {expandedChats[chat.id] && (
                      <CardContent className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Response:</h3>
                          <div className="prose max-w-none mt-4">
                            <ReactMarkdown>{chat.response}</ReactMarkdown>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 bg-opacity-90 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}