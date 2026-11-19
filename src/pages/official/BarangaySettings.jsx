import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { isBarangayEditor, isSkEditor, isSkRole } from "../../utils/roles";
import FormField from "../../components/ui/FormField";
import ErrorBanner from "../../components/ui/ErrorBanner";
import {
  Building2,
  Upload,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Info,
  ContactRound,
} from "lucide-react";
import {
  PROVINCES_LIST,
  getCitiesMunicipalities,
  getBarangays,
  generateSlug,
} from "../../lib/philippineLocations";

export default function BarangaySettings() {
  const { profile, refreshProfile } = useAuth();
  const skMember = isSkRole(profile?.role);
  const canEdit = skMember
    ? isSkEditor(profile?.role)
    : isBarangayEditor(profile?.role);
  const logoField = skMember ? "sk_logo_url" : "logo_url";
  const officeLabel = skMember ? "SK" : "Barangay";

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    municipality: "",
    province: "",
    contact_email: "",
    contact_number: "",
    logo_url: "",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [locationBarangays, setLocationBarangays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!profile?.barangay_id) return;
    supabase
      .from("barangays")
      .select("*")
      .eq("id", profile.barangay_id)
      .single()
      .then(({ data, error: qErr }) => {
        if (data) {
          setForm({
            name: data.name || "",
            municipality: data.municipality || "",
            province: data.province || "",
            contact_email: data.contact_email || "",
            contact_number: data.contact_number || "",
            logo_url: data[logoField] || "",
          });
          setLogoPreview(data[logoField] || "");
        } else if (qErr) {
          setError(qErr.message);
        }
        setLoading(false);
      });
  }, [profile?.barangay_id, logoField]);

  useEffect(() => {
    setCities([]);
    setSelectedCity(null);
    setLocationBarangays([]);
    if (selectedProvince)
      getCitiesMunicipalities(selectedProvince).then(setCities);
  }, [selectedProvince]);

  useEffect(() => {
    setLocationBarangays([]);
    if (selectedCity)
      getBarangays(selectedCity.code).then(setLocationBarangays);
  }, [selectedCity]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(
        file.type,
      )
    ) {
      setError("Logo must be a JPG, PNG, WEBP, or SVG image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo file size must be under 5MB.");
      return;
    }
    setError("");
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  };

  const uploadLogo = async () => {
    if (!logoFile) return form.logo_url;

    // Try Supabase Storage upload
    const ext = logoFile.name.split(".").pop() || "png";
    const filePath = `${skMember ? "sk-logo" : "logo"}-${profile.barangay_id}-${Date.now()}.${ext}`;

    try {
      const { error: upErr } = await supabase.storage
        .from("barangay-logos")
        .upload(filePath, logoFile, { upsert: true });
      if (!upErr) {
        const { data: pubData } = supabase.storage
          .from("barangay-logos")
          .getPublicUrl(filePath);
        if (pubData?.publicUrl) return pubData.publicUrl;
      }
    } catch (_) {
      // Fall through to Base64 data URL fallback
    }

    // Base64 Data URL Fallback for seamless working
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(form.logo_url);
      reader.readAsDataURL(logoFile);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      setError(
        `You must be an authorized ${officeLabel} editor to update these settings.`,
      );
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const finalLogoUrl = await uploadLogo();

      const { error: uErr } = await supabase
        .from("barangays")
        .update({
          name: form.name,
          slug: generateSlug(form.name, form.municipality),
          municipality: form.municipality || null,
          province: form.province || null,
          contact_email: form.contact_email || null,
          contact_number: form.contact_number || null,
          [logoField]: finalLogoUrl || null,
        })
        .eq("id", profile.barangay_id);

      if (uErr) {
        setError(uErr.message);
      } else {
        setSuccess(`${officeLabel} profile & logo updated successfully!`);
        setForm((prev) => ({ ...prev, logo_url: finalLogoUrl || "" }));
        await refreshProfile();
      }
    } catch (err) {
      setError(err.message || "Failed to save barangay settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl" role="status">
        <div className="card flex min-h-40 items-center justify-center gap-3 text-sm font-medium text-slate-500">
          <Building2 className="h-5 w-5 animate-pulse text-civic-emerald" />
          Loading {officeLabel.toLowerCase()} settings…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6">
      <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-civic-navy via-[#153a59] to-civic-slate p-5 text-white shadow-lg sm:rounded-3xl sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[28px] border-white/5 sm:h-56 sm:w-56" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-44 w-44 rounded-full bg-civic-emerald/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-emerald-200 sm:h-12 sm:w-12">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-blue-100">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                {skMember ? "SK portal" : "Barangay portal"}
              </span>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                {officeLabel} profile & branding
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-blue-100/80">
                Update public profile details, contact information, and the logo
                residents see on your portal.
              </p>
            </div>
          </div>
          <div
            className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
              canEdit
                ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                : "border-amber-200/20 bg-amber-200/10 text-amber-100"
            }`}
          >
            {canEdit ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {canEdit ? "Editing enabled" : "View only"}
          </div>
        </div>
      </section>

      <ErrorBanner message={error} />

      {success && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <section className="card space-y-5 sm:space-y-6">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-civic-emerald">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-civic-navy">
                {officeLabel} portal logo
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {skMember
                  ? "This logo appears across the SK portal and youth-facing public pages."
                  : "This logo appears across your Barangay portal and public pages."}
              </p>
            </div>
          </div>

          <div className="grid items-center gap-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
            <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner sm:mx-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt={`${officeLabel} logo preview`}
                  className="h-full w-full rounded-xl object-contain"
                  onError={() => setLogoPreview("")}
                />
              ) : (
                <div className="text-center text-slate-400">
                  <Building2 className="mx-auto h-10 w-10 opacity-50" />
                  <span className="mt-1 block text-xs font-medium">
                    Logo preview
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-4">
              {canEdit ? (
                <>
                  <div>
                    <label className="label" htmlFor="office-logo">
                      Upload an image
                    </label>
                    <input
                      id="office-logo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={handleFileChange}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor="office-logo"
                      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-civic-navy shadow-sm transition hover:border-civic-emerald/40 hover:bg-emerald-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-civic-navy"
                    >
                      <Upload className="h-4 w-4 text-civic-emerald" />
                      Choose logo file
                    </label>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      PNG, JPG, WEBP, or SVG · 5 MB maximum
                    </p>
                    {logoFile && (
                      <p className="mt-2 break-all text-xs font-medium text-slate-700">
                        Selected: {logoFile.name}
                      </p>
                    )}
                  </div>

                  <FormField
                    label="Or use an image URL"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={form.logo_url}
                    onChange={(e) => {
                      setForm({ ...form, logo_url: e.target.value });
                      if (!logoFile) setLogoPreview(e.target.value);
                    }}
                  />
                </>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  You can view the current logo, but only authorized{" "}
                  {officeLabel.toLowerCase()} editors can change it.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card space-y-5 sm:space-y-6">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-civic-navy">
                Public profile
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                These details help residents identify and find your Barangay
                portal.
              </p>
            </div>
          </div>

          {skMember && (
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-sm leading-relaxed text-blue-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              <p>
                Changes here update the shared Barangay profile. Your SK logo
                is managed separately.
              </p>
            </div>
          )}

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Barangay name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!canEdit}
              />
              <FormField
                label="Municipality / city"
                placeholder="e.g. Quezon City"
                value={form.municipality}
                onChange={(e) =>
                  setForm({ ...form, municipality: e.target.value })
                }
                disabled={!canEdit}
              />
              <FormField
                label="Province"
                placeholder="e.g. Metro Manila / Isabela"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Address list{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Select a location to fill in the profile fields above, or
                  enter those details manually.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  as="select"
                  label="Province / region"
                  value={selectedProvince?.code || ""}
                  onChange={(e) => {
                    const province =
                      PROVINCES_LIST.find(
                        (item) => item.code === e.target.value,
                      ) || null;
                    setSelectedProvince(province);
                    if (province)
                      setForm((prev) => ({
                        ...prev,
                        province: province.name,
                        municipality: "",
                      }));
                  }}
                  disabled={!canEdit}
                >
                  <option value="">Choose a province</option>
                  {PROVINCES_LIST.map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </FormField>
                <FormField
                  as="select"
                  label="Municipality / city"
                  value={selectedCity?.code || ""}
                  onChange={(e) => {
                    const city =
                      cities.find((item) => item.code === e.target.value) ||
                      null;
                    setSelectedCity(city);
                    if (city)
                      setForm((prev) => ({ ...prev, municipality: city.name }));
                  }}
                  disabled={!canEdit || !selectedProvince}
                >
                  <option value="">Choose a municipality / city</option>
                  {cities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </FormField>
                <FormField
                  as="select"
                  label="Barangay"
                  value={
                    locationBarangays.find(
                      (barangay) => barangay.name === form.name,
                    )?.code || ""
                  }
                  onChange={(e) => {
                    const barangay = locationBarangays.find(
                      (item) => item.code === e.target.value,
                    );
                    if (barangay)
                      setForm((prev) => ({ ...prev, name: barangay.name }));
                  }}
                  disabled={!canEdit || !selectedCity}
                >
                  <option value="">Choose a barangay</option>
                  {locationBarangays.map((barangay) => (
                    <option key={barangay.code} value={barangay.code}>
                      {barangay.name}
                    </option>
                  ))}
                </FormField>
              </div>
            </div>
          </div>
        </section>

        <section className="card space-y-5">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <ContactRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-civic-navy">
                Public contact details
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {skMember
                  ? "These contact details are shared with the Barangay public profile."
                  : "Add the contact information residents can use to reach your office."}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Contact email"
              type="email"
              placeholder="barangay@example.gov.ph"
              value={form.contact_email}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
              disabled={!canEdit}
            />
            <FormField
              label="Contact phone"
              type="tel"
              placeholder="09171234567 or (02) 8123-4567"
              value={form.contact_number}
              onChange={(e) =>
                setForm({ ...form, contact_number: e.target.value })
              }
              disabled={!canEdit}
            />
          </div>
        </section>

        {canEdit && (
          <div className="-mx-4 sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
            <button
              type="submit"
              disabled={saving}
              className="btn-emerald w-full px-6 sm:ml-auto sm:w-auto"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving changes…" : "Save changes"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
