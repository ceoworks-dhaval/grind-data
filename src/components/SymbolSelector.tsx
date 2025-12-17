import { useState, useMemo, useRef, useEffect } from "react";
import type { SymbolInfo } from "../types";
import "./SymbolSelector.css";

interface Props {
  symbols: SymbolInfo[];
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}

export function SymbolSelector({ symbols, selectedSymbol, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    if (!search) return symbols.slice(0, 50);
    const term = search.toLowerCase();
    return symbols
      .filter(
        (s) =>
          s.symbol.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [symbols, search]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlighted = listRef.current.children[highlightedIndex];
      highlighted?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          onSelect(filtered[highlightedIndex].symbol);
          setSearch("");
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const selectedInfo = symbols.find((s) => s.symbol === selectedSymbol);

  return (
    <div className="symbol-selector">
      <label>Symbol</label>
      <div className="selector-container">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={selectedSymbol || "Search symbol..."}
        />
        {selectedSymbol && !search && (
          <span className="selected-badge">{selectedSymbol}</span>
        )}
        {isOpen && filtered.length > 0 && (
          <ul ref={listRef} className="symbol-dropdown">
            {filtered.map((s, i) => (
              <li
                key={s.symbol}
                className={i === highlightedIndex ? "highlighted" : ""}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={() => {
                  onSelect(s.symbol);
                  setSearch("");
                  setIsOpen(false);
                }}
              >
                <span className="symbol-name">{s.symbol}</span>
                <span className="symbol-desc">{s.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedInfo && (
        <div className="selected-description">{selectedInfo.description}</div>
      )}
    </div>
  );
}
