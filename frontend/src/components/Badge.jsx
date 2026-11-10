import { useState, useRef } from "react";
import { Package, Check, Search, MapPin, Eye, EyeOff } from "lucide-react";
import { ST, C, LV, STEPS, NOTIFS, LIVS } from "../data/mock";

const Badge = ({ s }) => <span className="badge" style={{ "--c": ST[s] }}>{s}</span>;

export default Badge;
