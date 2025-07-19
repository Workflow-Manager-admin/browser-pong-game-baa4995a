import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Pong heading", () => {
  render(<App />);
  expect(screen.getByText(/pong/i)).toBeInTheDocument();
});

test("renders Start button", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
});

test("renders how to play/help button", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /how to play/i })).toBeInTheDocument();
});
