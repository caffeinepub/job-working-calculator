import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getAuthActor } from "../authActor";

interface RegisterProps {
  onGoLogin: () => void;
}

export function Register({ onGoLogin }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    setLoading(true);
    try {
      const actor = await getAuthActor();
      const result = await actor.registerUser(username.trim(), password);
      if ("ok" in result) {
        setSuccess(true);
      } else {
        toast.error(result.err || "Registration failed");
      }
    } catch {
      toast.error("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Calculator size={24} className="text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">JobCalc Pro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create your account
            </p>
          </div>
        </div>

        <Card
          className="border border-border shadow-card"
          data-ocid="register.card"
        >
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Register</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div
                className="text-center py-4 space-y-4"
                data-ocid="register.success_state"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Registration submitted!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wait for admin approval before logging in.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onGoLogin}
                  data-ocid="register.link"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input
                    id="reg-username"
                    autoComplete="username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    data-ocid="register.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-ocid="register.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm">Confirm Password</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    data-ocid="register.input"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading || !username.trim() || !password || !confirm
                  }
                  data-ocid="register.submit_button"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  {loading ? "Registering…" : "Register"}
                </Button>
              </form>
            )}
            {!success && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={onGoLogin}
                  data-ocid="register.link"
                >
                  Login
                </button>
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/50">
          &copy; {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
