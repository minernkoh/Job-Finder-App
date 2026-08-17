/**
 * Editable master profile used as the source of truth for JD resume tailoring.
 */

"use client";

import { useEffect, useState } from "react";
import type {
  EducationEntry,
  ExperienceEntry,
  ProfileContact,
  ProjectEntry,
  SkillGroup,
  UserProfile,
} from "@schemas";
import { Button, Card, CardContent, Input, Label } from "@ui/components";
import { CARD_PADDING_COMPACT, GAP_MD, TEXTAREA_BASE_CLASS } from "@/lib/layout";
import { EYEBROW_CLASS } from "@/lib/styles";
import { cn } from "@ui/components/lib/utils";
import { updateProfile } from "@/lib/api/profile";
import { toast } from "sonner";

function bulletsToText(bullets: string[] | undefined): string {
  return (bullets ?? []).join("\n");
}

function textToBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

interface MasterProfileEditorProps {
  profile: UserProfile | undefined;
  onSaved: () => void;
}

export function MasterProfileEditor({ profile, onSaved }: MasterProfileEditorProps) {
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [contacts, setContacts] = useState<ProfileContact>({});
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [honoursText, setHonoursText] = useState("");
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setHeadline(profile.headline ?? "");
    setContacts(profile.contacts ?? {});
    setExperience(profile.experience ?? []);
    setProjects(profile.projects ?? []);
    setEducation(profile.education ?? []);
    setHonoursText((profile.honours ?? []).join("\n"));
    setSkillGroups(profile.skillGroups ?? []);
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    try {
      const honours = textToBullets(honoursText);
      await updateProfile({
        name: name.trim() || undefined,
        headline: headline.trim() || undefined,
        contacts,
        experience,
        projects,
        education,
        honours,
        skillGroups,
      });
      toast.success("Master profile saved");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="default">
      <CardContent className={cn(CARD_PADDING_COMPACT, GAP_MD)}>
        <p className={EYEBROW_CLASS}>Master profile</p>
        <p className="text-sm text-muted-foreground">
          Tailored resumes use only these facts. Edit anything the parser got wrong before you tailor.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mp-name">Name</Label>
            <Input id="mp-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-headline">Headline</Label>
            <Input
              id="mp-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
              ["linkedin", "LinkedIn"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`mp-${key}`}>{label}</Label>
              <Input
                id={`mp-${key}`}
                value={contacts[key] ?? ""}
                onChange={(e) =>
                  setContacts((c) => ({ ...c, [key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={EYEBROW_CLASS}>Experience</p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() =>
                setExperience((prev) => [
                  ...prev,
                  { company: "", title: "", period: "", bullets: [] },
                ])
              }
            >
              Add role
            </Button>
          </div>
          {experience.map((entry, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Company"
                  value={entry.company}
                  onChange={(e) =>
                    setExperience((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, company: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  placeholder="Title"
                  value={entry.title}
                  onChange={(e) =>
                    setExperience((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  placeholder="Period"
                  value={entry.period ?? ""}
                  onChange={(e) =>
                    setExperience((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, period: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <textarea
                className={cn(TEXTAREA_BASE_CLASS, "min-h-[80px]")}
                placeholder="One bullet per line"
                value={bulletsToText(entry.bullets)}
                onChange={(e) =>
                  setExperience((prev) =>
                    prev.map((x, idx) =>
                      idx === i ? { ...x, bullets: textToBullets(e.target.value) } : x,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-destructive"
                onClick={() => setExperience((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remove role
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={EYEBROW_CLASS}>Projects</p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setProjects((prev) => [...prev, { name: "", bullets: [] }])}
            >
              Add project
            </Button>
          </div>
          {projects.map((entry, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <Input
                placeholder="Project name"
                value={entry.name}
                onChange={(e) =>
                  setProjects((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                  )
                }
              />
              <textarea
                className={cn(TEXTAREA_BASE_CLASS, "min-h-[64px]")}
                placeholder="One bullet per line"
                value={bulletsToText(entry.bullets)}
                onChange={(e) =>
                  setProjects((prev) =>
                    prev.map((x, idx) =>
                      idx === i ? { ...x, bullets: textToBullets(e.target.value) } : x,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={EYEBROW_CLASS}>Education</p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setEducation((prev) => [...prev, { school: "" }])}
            >
              Add education
            </Button>
          </div>
          {education.map((entry, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              <Input
                placeholder="School"
                value={entry.school}
                onChange={(e) =>
                  setEducation((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, school: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Credential"
                value={entry.credential ?? ""}
                onChange={(e) =>
                  setEducation((prev) =>
                    prev.map((x, idx) =>
                      idx === i ? { ...x, credential: e.target.value } : x,
                    ),
                  )
                }
              />
              <Input
                placeholder="Period"
                value={entry.period ?? ""}
                onChange={(e) =>
                  setEducation((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, period: e.target.value } : x)),
                  )
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mp-honours">Honours</Label>
          <textarea
            id="mp-honours"
            className={cn(TEXTAREA_BASE_CLASS, "min-h-[64px]")}
            placeholder="One honour per line"
            value={honoursText}
            onChange={(e) => setHonoursText(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={EYEBROW_CLASS}>Skill groups</p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSkillGroups((prev) => [...prev, { name: "", skills: [] }])}
            >
              Add group
            </Button>
          </div>
          {skillGroups.map((group, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[8rem_1fr]">
              <Input
                placeholder="Group"
                value={group.name}
                onChange={(e) =>
                  setSkillGroups((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Comma-separated skills"
                value={group.skills.join(", ")}
                onChange={(e) =>
                  setSkillGroups((prev) =>
                    prev.map((x, idx) =>
                      idx === i
                        ? {
                            ...x,
                            skills: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }
                        : x,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>

        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save master profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
