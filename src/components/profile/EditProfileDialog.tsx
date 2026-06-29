/**
 * EditProfileDialog — edit the user's display name, bio, and location.
 * Renders its own trigger button (the Profile "Edit profile" button) and persists
 * via saveProfile (profiles table + auth metadata sync). On success it hands the
 * saved values back to the parent so the page updates without a refetch.
 */
import { useEffect, useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveProfile, type ProfileEditInput } from "@/lib/profileUtils";

interface EditProfileDialogProps {
  userId: string;
  current: ProfileEditInput;
  onSaved: (next: ProfileEditInput) => void;
}

const EditProfileDialog = ({ userId, current, onSaved }: EditProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(current.fullName);
  const [bio, setBio] = useState(current.bio);
  const [location, setLocation] = useState(current.location);
  const [saving, setSaving] = useState(false);

  // Reseed fields from the latest values each time the dialog opens.
  useEffect(() => {
    if (open) {
      setFullName(current.fullName);
      setBio(current.bio);
      setLocation(current.location);
    }
  }, [open, current.fullName, current.bio, current.location]);

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    const next: ProfileEditInput = { fullName: trimmedName, bio: bio.trim(), location: location.trim() };
    const result = await saveProfile(userId, next);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error || "Couldn't save your profile");
      return;
    }
    toast.success("Profile updated");
    onSaved(next);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-border-strong bg-card px-4.5 py-2.5 text-sm font-medium text-fg-secondary hover:bg-surface-sunken">
          <Pencil className="h-3.5 w-3.5" /> Edit profile
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update how you show up across TradLyte.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line about how you invest"
              maxLength={280}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-location">Location</Label>
            <Input
              id="profile-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              maxLength={80}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
