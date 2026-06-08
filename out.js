(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/components/Sidebar.tsx
  var import_react = __require("react");
  var import_lucide_react = __require("lucide-react");

  // src/components/Logo.tsx
  var import_jsx_runtime = __require("react/jsx-runtime");
  function GoogleLogo({ className = "icon-xl" }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { className, viewBox: "0 0 32 32", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "16", width: "12", height: "12", rx: "6", fill: "#EA4335" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "17", y: "16", width: "12", height: "12", rx: "4", fill: "#FBBC04" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "2", width: "12", height: "12", rx: "4", fill: "#34A853" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "17", y: "2", width: "12", height: "12", rx: "6", fill: "#4285F4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "16", cy: "16", r: "3", fill: "white" })
    ] });
  }

  // src/components/Sidebar.tsx
  var import_jsx_runtime2 = __require("react/jsx-runtime");
  var iconMap = {
    LayoutDashboard: import_lucide_react.LayoutDashboard,
    Film: import_lucide_react.Film,
    ImageIcon: import_lucide_react.Image,
    UserCircle2: import_lucide_react.UserCircle2,
    PenTool: import_lucide_react.PenTool,
    MessageSquare: import_lucide_react.MessageSquare,
    Mic: import_lucide_react.Mic,
    Scissors: import_lucide_react.Scissors,
    BarChart2: import_lucide_react.BarChart2,
    Folder: import_lucide_react.Folder,
    Briefcase: import_lucide_react.Briefcase,
    ListTodo: import_lucide_react.ListTodo,
    Users: import_lucide_react.Users,
    Share2: import_lucide_react.Share2,
    Settings: import_lucide_react.Settings,
    Shield: import_lucide_react.Shield,
    LayoutTemplate: import_lucide_react.LayoutTemplate,
    MonitorPlay: import_lucide_react.MonitorPlay,
    PanelTop: import_lucide_react.PanelTop,
    Palette: import_lucide_react.Palette,
    ImageMinus: import_lucide_react.ImageMinus,
    Copy: import_lucide_react.Copy,
    Video: import_lucide_react.Video,
    Wand2: import_lucide_react.Wand2,
    Layers: import_lucide_react.Layers,
    Type: import_lucide_react.Type,
    Sparkles: import_lucide_react.Sparkles,
    CreditCard: import_lucide_react.CreditCard,
    BookType: import_lucide_react.BookType,
    Wrench: import_lucide_react.Wrench,
    ScanLine: import_lucide_react.ScanLine,
    SmartphoneNfc: import_lucide_react.SmartphoneNfc,
    Globe: import_lucide_react.Globe,
    Building2: import_lucide_react.Building2,
    Home: import_lucide_react.Home,
    Network: import_lucide_react.Network,
    Package: import_lucide_react.Package,
    Megaphone: import_lucide_react.Megaphone,
    Shirt: import_lucide_react.Shirt,
    Key: import_lucide_react.Key,
    Store: import_lucide_react.Store,
    UsersRound: import_lucide_react.UsersRound,
    Gift: import_lucide_react.Gift,
    Split: import_lucide_react.Split,
    Smartphone: import_lucide_react.Smartphone,
    ShoppingBag: import_lucide_react.ShoppingBag,
    Headphones: import_lucide_react.Headphones,
    Activity: import_lucide_react.Activity,
    HeartPulse: import_lucide_react.HeartPulse,
    Zap: import_lucide_react.Zap,
    Calculator: import_lucide_react.Calculator,
    Wallet: import_lucide_react.Wallet
  };
  var navGroups = [
    {
      title: "\u6211\u7684 Agent \u770B\u677F",
      items: [
        { id: "dashboard", label: "\u5168\u57DF\u6307\u6325\u6982\u89C8", icon: "LayoutDashboard" },
        { id: "workflow", label: "Agent \u96C6\u7FA4\u72B6\u6001", icon: "Network" },
        { id: "tasks", label: "\u5168\u5C40\u4EFB\u52A1\u8C03\u5EA6", icon: "ListTodo" },
        { id: "agent_status", label: "Agent \u72B6\u6001\u76D1\u6D4B", icon: "HeartPulse" }
      ]
    },
    {
      title: "\u4E3B\u7406\u4EBA\uFF1A\u7535\u5546\u64CD\u76D8",
      items: [
        { id: "e_main_image", label: "\u4E3B\u56FE\u8BBE\u8BA1", icon: "LayoutTemplate" },
        { id: "e_video", label: "\u5546\u54C1\u89C6\u9891", icon: "MonitorPlay" },
        { id: "e_detail_page", label: "\u8BE6\u60C5\u9875\u8BBE\u8BA1\u52A9\u7406", icon: "PanelTop" },
        { id: "e_poster", label: "\u521B\u610F\u6D77\u62A5", icon: "Palette" },
        { id: "ai_image_edit", label: "AI\u56FE\u50CF\u7F16\u8F91", icon: "Sparkles" },
        { id: "e_clone", label: "\u514B\u9686\u8BBE\u8BA1", icon: "Copy" }
      ]
    },
    {
      title: "\u4E3B\u7406\u4EBA\uFF1A\u65E0\u754C\u521B\u4F5C",
      items: [
        { id: "video", label: "\u89C6\u9891\u521B\u4F5C\u5F15\u64CE", icon: "Film" },
        { id: "image", label: "\u5546\u7528\u7EA7\u56FE\u50CF\u751F\u6210", icon: "ImageIcon" },
        { id: "ai_canvas", label: "\u65E0\u9650\u6A21\u6001 AI \u753B\u5E03", icon: "Palette" },
        { id: "chat", label: "\u5168\u80FD\u987E\u95EE\u5BF9\u8BDD", icon: "MessageSquare" },
        { id: "speech", label: "\u591A\u8BED\u79CD\u8BED\u97F3\u5F15\u64CE", icon: "Mic" }
      ]
    },
    {
      title: "\u4E3B\u7406\u4EBA\uFF1A\u6587\u6848\u8425\u9500",
      items: [
        { id: "copywriting_create", label: "\u6587\u6848\u521B\u4F5C", icon: "PenTool" },
        { id: "copywriting_tools", label: "\u521B\u4F5C\u5DE5\u5177", icon: "Wrench" },
        { id: "copywriting_keywords", label: "\u5173\u952E\u8BCD\u5E93", icon: "BookType" }
      ]
    },
    {
      title: "\u4E3B\u7406\u4EBA\uFF1A\u89C6\u9891\u5DE5\u4E1A",
      items: [
        { id: "remix_home", label: "\u6DF7\u526A\u9996\u9875", icon: "Home" },
        { id: "remix_smart", label: "\u667A\u80FD\u6DF7\u526A", icon: "Wand2" },
        { id: "remix_viral", label: "\u7206\u6B3E\u89C6\u9891\u590D\u523B", icon: "Sparkles" },
        { id: "remix_materials", label: "\u6DF7\u526A\u7D20\u6750", icon: "Layers" },
        { id: "remix_titles", label: "\u6807\u9898\u6A21\u677F", icon: "Type" },
        { id: "remix_templates", label: "\u89C6\u9891\u6A21\u677F", icon: "LayoutTemplate" }
      ]
    },
    {
      title: "\u4E3B\u7406\u4EBA\uFF1A\u5206\u8EAB\u76F4\u64AD",
      items: [
        { id: "avatar_home", label: "\u5206\u8EAB\u7BA1\u7406", icon: "LayoutDashboard" },
        { id: "avatar_create", label: "\u514B\u9686\u58F0\u97F3\u4E0E\u5F62\u8C61", icon: "Video" },
        { id: "avatar_voice", label: "\u58F0\u97F3\u8D44\u4EA7", icon: "Mic" },
        { id: "avatar_space", label: "\u6570\u5B57\u4EBA\u7A7A\u95F4", icon: "UserCircle2" }
      ]
    },
    {
      title: "\u4E3B\u7406\u4EBA\uFF1A\u79C1\u57DF\u4E0E\u5BA2\u6237",
      items: [
        { id: "crm", label: "\u667A\u80FD\u5BA2\u6237\u7BA1\u5BB6 (CRM)", icon: "UsersRound" },
        { id: "customer_service", label: "\u5168\u5929\u5019 AI \u5BA2\u670D", icon: "Headphones" }
      ]
    },
    {
      title: "\u5927\u822A\u6D77\uFF1A\u5168\u57DF\u88C2\u53D8",
      items: [
        { id: "marketing_viral", label: "\u7206\u5E97\u7801", icon: "ScanLine" },
        { id: "marketing_nfc", label: "\u78B0\u4E00\u78B0", icon: "SmartphoneNfc" },
        { id: "marketing_website", label: "\u667A\u80FD\u5B98\u7F51", icon: "Globe" }
      ]
    },
    {
      title: "\u5BFC\u6F14\u53F0\u4E0E\u5206\u955C\u6D41",
      items: [
        { id: "director_desk", label: "\u5168\u5C40\u5BFC\u6F14\u53F0", icon: "Video" }
      ]
    },
    {
      title: "\u4E3B\u7406\u4EBA\uFF1A\u5305\u63FD\u8BBE\u8BA1",
      items: [
        { id: "design_logo", label: "\u667A\u80FD LOGO", icon: "Palette" },
        { id: "design_packaging", label: "AI \u5305\u88C5\u8BBE\u8BA1", icon: "Package" },
        { id: "design_ads", label: "\u5E7F\u544A\u521B\u610F", icon: "Megaphone" },
        { id: "design_interior", label: "AI \u5BB6\u88C5\u8BBE\u8BA1", icon: "Home" },
        { id: "design_fashion", label: "AI \u670D\u88C5\u8BBE\u8BA1", icon: "Shirt" }
      ]
    },
    {
      title: "\u6211\u7684\u6570\u5B57\u8D44\u4EA7\u5E93",
      items: [
        { id: "data", label: "\u4E1A\u52A1\u6570\u636E\u7F57\u76D8", icon: "BarChart2" },
        { id: "assets", label: "\u6570\u5B57\u8D44\u4EA7\u4FDD\u9669\u5E93", icon: "Folder" },
        { id: "projects", label: "\u54C1\u724C\u77E5\u8BC6\u5E93", icon: "Briefcase" }
      ]
    },
    {
      title: "\u865A\u62DF\u6570\u5B57\u5458\u5DE5",
      items: [
        { id: "team", label: "\u6570\u5B57\u5458\u5DE5\u6982\u89C8", icon: "Building2" },
        { id: "sub_accounts", label: "\u5206\u53D1\u77E9\u9635\u8D26\u53F7", icon: "Users" },
        { id: "team_write", label: "\u4EBA\u673A\u63A8\u6F14\u534F\u4F5C", icon: "PenTool" },
        { id: "team_tasks", label: "\u5F02\u6B65\u534F\u540C\u4EFB\u52A1", icon: "ListTodo" },
        { id: "team_assets", label: "\u5171\u4EAB\u7ED9Agent\u7684\u5E93", icon: "Folder" },
        { id: "team_more", label: "\u4E3B\u7406\u4EBA\u5BA1\u6279\u6D41", icon: "Layers" }
      ]
    },
    {
      title: "\u4E91\u8FDE\u9501\u4E0E\u5C0F\u5E97\u7FA4",
      items: [
        { id: "store_dashboard", label: "\u591A\u5E97\u5168\u76D8\u770B\u677F", icon: "LayoutDashboard" },
        { id: "store_list", label: "\u95E8\u5E97\u5B98\u7F51\u4E0E\u5206\u5E97", icon: "Store" },
        { id: "store_orders", label: "\u7EDF\u4E00\u8BA2\u5355\u7BA1\u7406", icon: "ShoppingBag" },
        { id: "store_inventory", label: "\u667A\u80FD\u8C03\u62E8\u4E0E\u5E93\u5B58", icon: "Package" },
        { id: "store_design", label: "\u95E8\u5E97\u7F51\u9875\u8BBE\u8BA1", icon: "LayoutTemplate" },
        { id: "store_staff", label: "\u865A\u62DF\u5BFC\u8D2D\u4E0E\u5DE1\u5E97", icon: "UsersRound" },
        { id: "store_marketing", label: "\u81EA\u52A8\u8425\u9500\u7B56\u7565", icon: "Megaphone" },
        { id: "store_distribution", label: "\u5206\u9500\u4EE3\u7406\u7F51\u7EDC", icon: "Split" },
        { id: "store_events", label: "\u6D3B\u52A8\u4E0E\u5F15\u6D41", icon: "Gift" },
        { id: "store_miniapp", label: "\u5C0F\u7A0B\u5E8F\u7AEF\u7BA1\u7406", icon: "Smartphone" }
      ]
    },
    {
      title: "\u7CFB\u7EDF\u5F15\u64CE\u4E0E\u6743\u9650",
      items: [
        { id: "media", label: "\u793E\u5A92\u77E9\u9635\u6302\u8F7D", icon: "Share2" },
        { id: "employee_accounts", label: "\u517C\u804C\u5458\u5DE5\u8D26\u53F7\u6C60", icon: "UserCircle2" },
        { id: "billing", label: "\u7B97\u529B\u4E0E Token \u76D1\u63A7", icon: "CreditCard" },
        { id: "saas_api_keys", label: "API \u5BC6\u94A5\u4E0E\u5F00\u53D1\u8005", icon: "Key" },
        { id: "settings", label: "\u5168\u5C40\u504F\u597D\u914D\u7F6E", icon: "Settings" },
        { id: "admin", label: "\u7CFB\u7EDF\u7BA1\u7406", icon: "Shield" },
        { id: "finance", label: "\u8D22\u52A1\u4E0E\u7968\u636E\u7BA1\u7406", icon: "Wallet" },
        { id: "tax", label: "\u7A0E\u52A1\u7B79\u5212\u4E0E\u8BA1\u7B97", icon: "Calculator" },
        { id: "activity_logs", label: "\u5168\u7AD9\u64CD\u4F5C\u5BA1\u8BA1\u65E5\u5FD7", icon: "Activity" }
      ]
    }
  ];
  function Sidebar({ activeModule, onSelect, isCollapsed, onOpenCopilot }) {
    const [expandedGroups, setExpandedGroups] = (0, import_react.useState)(() => {
      const initialState = {};
      navGroups.forEach((group) => {
        initialState[group.title] = true;
      });
      return initialState;
    });
    const [sortByUsage, setSortByUsage] = (0, import_react.useState)(false);
    const [usageData, setUsageData] = (0, import_react.useState)({});
    (0, import_react.useEffect)(() => {
      if (sortByUsage) {
        try {
          const stored = localStorage.getItem("module_time_tracker");
          if (stored) setUsageData(JSON.parse(stored));
        } catch {
        }
      }
    }, [sortByUsage, activeModule]);
    (0, import_react.useEffect)(() => {
      let groupTitleToExpand = "";
      for (const group of navGroups) {
        if (group.items.some((item) => item.id === activeModule)) {
          groupTitleToExpand = group.title;
          break;
        }
      }
      if (groupTitleToExpand && (!expandedGroups[groupTitleToExpand] || sortByUsage)) {
        setExpandedGroups((prev) => ({ ...prev, [groupTitleToExpand]: true }));
      }
    }, [activeModule]);
    const toggleGroup = (title) => {
      setExpandedGroups((prev) => ({
        ...prev,
        [title]: !prev[title]
      }));
    };
    const displayGroups = sortByUsage ? [{
      title: "\u5E38\u7528\u5E94\u7528\u667A\u80FD\u6392\u5E8F (Usage)",
      items: navGroups.flatMap((g) => g.items).sort((a, b) => (usageData[b.id] || 0) - (usageData[a.id] || 0))
    }] : navGroups;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: `flex flex-col bg-[var(--bg-panel)] border-r border-[#E5E7EB] shadow-[1px_0_10px_rgba(0,0,0,0.02)] h-full transition-all duration-300 ease-in-out ${isCollapsed ? "w-[#5.5rem]" : "w-64"}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "h-16 flex items-center px-4 border-b border-[#E5E7EB] flex-shrink-0 bg-[var(--bg-panel)]", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(GoogleLogo, { className: "icon-xl flex-shrink-0" }),
        !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ml-3 flex flex-col justify-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "font-extrabold text-[var(--text-main)] text-[16px] tracking-tight hover:text-black transition-colors cursor-pointer leading-none", children: "\u4E2A\u4EBAAI\u52A9\u624B" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-[10px] text-blue-500 font-bold tracking-wider mt-1 flex items-center", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" }),
              "\u591AAGENT\u96C6\u7FA4\u5C31\u7EEA"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ml-auto w-10 h-10 relative flex items-center justify-center  tooltip", title: "Agent Capacity / Daily Quota: 82%", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { className: "w-full h-full transform -rotate-90", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "20", cy: "20", r: "14", stroke: "currentColor", strokeWidth: "3", fill: "transparent", className: "text-gray-100" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "20", cy: "20", r: "14", stroke: "currentColor", strokeWidth: "3", fill: "transparent", strokeDasharray: "88", strokeDashoffset: "16", className: "text-blue-500", strokeLinecap: "round" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "absolute text-[9px] font-black text-gray-700", children: "82%" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex-1 overflow-y-auto py-3 hide-scrollbar", children: [
        !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "px-4 mb-4 space-y-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors group relative shadow-sm", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center space-x-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "icon-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center rounded-lg font-bold text-[11px] shadow-sm", children: "AI" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[13px] font-bold text-[var(--text-main)] leading-tight", children: "\u591AAGENT\u5DE5\u4F5C\u7A7A\u95F4" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[10px] text-[var(--text-muted)] font-medium tracking-wide", children: "\u8D85\u7EA7\u4E2A\u4F53 Pro" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { className: "icon-sm text-gray-400 group-hover:text-gray-600 transition-colors", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 9l4-4 4 4m0 6l-4 4-4-4" }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              onClick: onOpenCopilot,
              className: "w-full flex items-center justify-center space-x-2 py-3 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] shadow-[0_1px_3px_rgba(26,115,232,0.3)] transition-all hover:shadow-[0_2px_6px_rgba(26,115,232,0.4)] font-bold text-sm relative group overflow-hidden",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react.Sparkles, { className: "icon-sm fill-white/80 animate-pulse" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u542F\u52A8\u5168\u80FD\u5206\u8EAB\u4EE3\u7406" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute inset-x-0 -bottom-2 h-6 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" })
              ]
            }
          )
        ] }),
        isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "px-2 mb-4 flex justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            onClick: onOpenCopilot,
            className: "w-12 h-12 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] flex items-center justify-center shadow-[0_1px_3px_rgba(26,115,232,0.3)] transition-all hover:shadow-[0_2px_6px_rgba(26,115,232,0.4)] group relative overflow-hidden",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react.Sparkles, { className: "icon-md fill-white" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute inset-0 bg-[var(--bg-panel)]/20 translate-y-full group-hover:translate-y-0 transition-transform" })
            ]
          }
        ) }),
        !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-panel)]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider", children: "Sort by Usage" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "relative inline-flex items-center cursor-pointer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "checkbox", className: "sr-only peer", checked: sortByUsage, onChange: () => setSortByUsage(!sortByUsage) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "py-2.5" }),
        displayGroups.map((group, index) => {
          const isExpanded = sortByUsage ? true : expandedGroups[group.title];
          const hasActiveItem = group.items.some((item) => item.id === activeModule);
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "mb-2", children: [
            !isCollapsed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "button",
              {
                onClick: () => toggleGroup(group.title),
                className: `w-full flex items-center justify-between px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-colors cursor-pointer group ${isExpanded || hasActiveItem ? "text-[var(--text-main)]" : "text-gray-400 hover:text-gray-600"}`,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "flex items-center space-x-2", children: group.title }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `transition-transform duration-200 ${isExpanded ? "rotate-180 text-blue-500" : "rotate-0 text-gray-300 group-hover:text-gray-400"}`, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react.ChevronDown, { className: "w-3.5 h-3.5" }) })
                ]
              }
            ) : index > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mx-4 my-3 border-t border-[var(--border-color)]" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "div",
              {
                className: `overflow-hidden transition-all duration-300 ease-in-out ${isExpanded && !isCollapsed || isCollapsed ? "max-h-[800px] opacity-100 mt-1" : "max-h-0 opacity-0"}`,
                children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { className: "space-y-1 px-3", children: group.items.map((item) => {
                  const Icon = iconMap[item.icon];
                  const isActive = activeModule === item.id;
                  const isAIFeature = group.title === "\u4E3B\u7406\u4EBA\uFF1A\u65E0\u754C\u521B\u4F5C" || group.title === "\u4E3B\u7406\u4EBA\uFF1A\u5206\u8EAB\u76F4\u64AD" || group.title === "\u4E3B\u7406\u4EBA\uFF1A\u89C6\u9891\u5DE5\u4E1A" || group.title === "\u865A\u62DF\u6570\u5B57\u5458\u5DE5" || group.title === "\u6211\u7684 Agent \u770B\u677F";
                  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      onClick: () => onSelect(item.id),
                      className: `w-full flex items-center px-3 py-2.5 rounded-[var(--radius-lg)] transition-all duration-200 group relative overflow-hidden ${isActive ? "bg-[#e8f0fe] text-[#1a73e8] font-bold" : "text-gray-600 font-medium hover:bg-gray-100 hover:text-[var(--text-main)]"}`,
                      title: isCollapsed ? item.label : void 0,
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                          Icon,
                          {
                            className: `flex-shrink-0 transition-colors ${isCollapsed ? "icon-lg mx-auto" : "w-[20px] h-[20px]"} ${isActive ? "text-[#1a73e8]" : "text-[var(--text-muted)] group-hover:text-gray-700"}`,
                            strokeWidth: isActive ? 2 : 1.5
                          }
                        ),
                        !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ml-3 flex-1 flex justify-between items-center pr-1", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: `text-[13px] truncate tracking-wide ${isActive ? "font-bold" : "font-medium"}`, children: item.label }),
                          isAIFeature && !isActive && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-1.5 h-1.5 rounded-full bg-indigo-200 group-hover:bg-indigo-400 transition-colors" })
                        ] })
                      ]
                    }
                  ) }, item.id);
                }) })
              }
            )
          ] }, index);
        })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "border-t border-[var(--border-color)] p-3 bg-[var(--bg-panel)] flex-shrink-0 relative", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            className: "absolute -top-14 right-4 w-10 h-10 bg-indigo-600 rounded-full shadow-lg text-white flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all group z-50",
            title: "Agent Quick-Switch",
            onClick: () => window.dispatchEvent(new CustomEvent("open_quick_switch")),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react.Zap, { className: "icon-md group-hover:animate-pulse" }),
              !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "absolute right-full mr-3 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-md font-bold whitespace-nowrap transition-opacity pointer-events-none", children: "\u5FEB\u901F\u5207\u6362 Agent (Quick-Switch)" })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { className: `w-full flex items-center p-2 rounded-[var(--radius-lg)] hover:bg-gray-50 transition-colors group ${isCollapsed ? "justify-center" : ""}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "icon-xl rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm relative", children: [
            "M",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" })
          ] }),
          !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ml-3 flex-1 text-left overflow-hidden", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[13px] font-bold text-[var(--text-main)] truncate", children: "Maheshenga" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center text-[11px] text-[var(--color-primary)] font-medium mt-0.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react.Sparkles, { className: "w-3 h-3 mr-1" }),
              "\u5C0A\u4EAB\u7248 Pro"
            ] })
          ] }),
          !isCollapsed && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react.LogOut, { className: "icon-sm text-gray-400 group-hover:text-gray-600 flex-shrink-0 ml-1" })
        ] })
      ] })
    ] });
  }
})();
