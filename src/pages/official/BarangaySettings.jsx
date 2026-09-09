import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { isBarangayEditor, isSkEditor, isSkRole } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Building2, Upload, Image as ImageIcon, Save, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';
import { PROVINCES_LIST, getCitiesMunicipalities, getBarangays } from '../../lib/philippineLocations';

export default function BarangaySettings() {
  const { profile, refreshProfile } = useAuth();
  const skMember = isSkRole(profile?.role);
  const canEdit = skMember ? isSkEditor(profile?.role) : isBarangayEditor(profile?.role);
  const logoField = skMember ? 'sk_logo_url' : 'logo_url';
  const officeLabel = skMember ? 'SK' : 'Barangay';

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    municipality: '',
    province: '',
    contact_email: '',
    contact_number: '',
    logo_url: '',
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [locationBarangays, setLocationBarangays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile?.barangay_id) return;
    supabase
      .from('barangays')
      .select('*')
      .eq('id', profile.barangay_id)
      .single()
      .then(({ data, error: qErr }) => {
        if (data) {
          setForm({
            name: data.name || '',
            municipality: data.municipality || '',
            province: data.province || '',
            contact_email: data.contact_email || '',
            contact_number: data.contact_number || '',
            logo_url: data[logoField] || '',
          });
          setLogoPreview(data[logoField] || '');
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
    if (selectedProvince) getCitiesMunicipalities(selectedProvince).then(setCities);
  }, [selectedProvince]);

  useEffect(() => {
    setLocationBarangays([]);
    if (selectedCity) getBarangays(selectedCity.code).then(setLocationBarangays);
  }, [selectedCity]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setError('Logo must be a JPG, PNG, WEBP, or SVG image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file size must be under 5MB.');
      return;
    }
    setError('');
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  };

  const uploadLogo = async () => {
    if (!logoFile) return form.logo_url;

    // Try Supabase Storage upload
    const ext = logoFile.name.split('.').pop() || 'png';
    const filePath = `${skMember ? 'sk-logo' : 'logo'}-${profile.barangay_id}-${Date.now()}.${ext}`;

    try {
      const { error: upErr } = await supabase.storage.from('barangay-logos').upload(filePath, logoFile, { upsert: true });
      if (!upErr) {
        const { data: pubData } = supabase.storage.from('barangay-logos').getPublicUrl(filePath);
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
      setError(`You must be an authorized ${officeLabel} editor to update these settings.`);
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const finalLogoUrl = await uploadLogo();

      const { error: uErr } = await supabase
        .from('barangays')
        .update({
          name: form.name,
          municipality: form.municipality || null,
          province: form.province || null,
          contact_email: form.contact_email || null,
          contact_number: form.contact_number || null,
          [logoField]: finalLogoUrl || null,
        })
        .eq('id', profile.barangay_id);

      if (uErr) {
        setError(uErr.message);
      } else {
        setSuccess(`${officeLabel} profile & logo updated successfully!`);
        setForm((prev) => ({ ...prev, logo_url: finalLogoUrl || '' }));
        await refreshProfile();
      }
    } catch (err) {
      setError(err.message || 'Failed to save barangay settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
        <Building2 className="w-5 h-5 animate-pulse text-civic-emerald" /> Loading barangay details…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-civic-navy">
            <Building2 className="w-8 h-8 text-civic-emerald" />
            {officeLabel} Profile & Branding
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Manage your {officeLabel.toLowerCase()} identity, contact information, and official logo.
          </p>
        </div>
        {!canEdit && (
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" /> View Only
          </div>
        )}
      </div>

      <ErrorBanner message={error} />

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Logo Upload Card */}
        <div className="card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-civic-navy flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-civic-emerald" /> Official {officeLabel} Logo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              This logo will be displayed on your official portal, public reports, and resident view.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              <div className="w-28 h-28 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner">
                {logoPreview ? (
                    <img src={logoPreview} alt={`${officeLabel} Logo Preview`} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto opacity-50" />
                    <span className="text-[10px] font-medium block mt-1">No Logo</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 flex-1 w-full">
              {canEdit ? (
                <>
                  <div>
                    <label className="label">Upload Logo Image (PNG, JPG, WEBP, SVG)</label>
                    <label className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-colors border border-slate-200">
                      <Upload className="w-4 h-4 text-civic-emerald" />
                      Choose Logo File…
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {logoFile && (
                      <span className="text-xs text-slate-600 block mt-1 font-medium">Selected: {logoFile.name}</span>
                    )}
                  </div>

                  <div className="pt-2">
                    <FormField
                      label="Or Provide Image URL"
                      placeholder="https://example.com/logo.png"
                      value={form.logo_url}
                      onChange={(e) => {
                        setForm({ ...form, logo_url: e.target.value });
                        if (!logoFile) setLogoPreview(e.target.value);
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 italic">Only barangay editors can update the official logo.</p>
              )}
            </div>
          </div>
        </div>

        {/* Barangay Information Card */}
        <div className="card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-civic-navy flex items-center gap-2">
              <MapPin className="w-5 h-5 text-civic-emerald" /> General Barangay Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Basic information about your Local Government Unit (LGU).</p>
          </div>

          <div className="space-y-4">
            <FormField
              label="Barangay Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={!canEdit}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                as="select"
                label="Province / Region"
                value={selectedProvince?.code || ''}
                onChange={(e) => {
                  const province = PROVINCES_LIST.find((item) => item.code === e.target.value) || null;
                  setSelectedProvince(province);
                  if (province) setForm((prev) => ({ ...prev, province: province.name, municipality: '' }));
                }}
                disabled={!canEdit}
              >
                <option value="">— choose to use address list —</option>
                {PROVINCES_LIST.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
              </FormField>
              <FormField
                as="select"
                label="Municipality / City from address list"
                value={selectedCity?.code || ''}
                onChange={(e) => {
                  const city = cities.find((item) => item.code === e.target.value) || null;
                  setSelectedCity(city);
                  if (city) setForm((prev) => ({ ...prev, municipality: city.name }));
                }}
                disabled={!canEdit || !selectedProvince}
              >
                <option value="">— choose municipality / city —</option>
                {cities.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
              </FormField>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                label="Municipality / City"
                placeholder="e.g. Quezon City"
                value={form.municipality}
                onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                disabled={!canEdit}
              />
              <FormField as="select" label="Barangay from address list (optional)" value={locationBarangays.find((barangay) => barangay.name === form.name)?.code || ''} onChange={(e) => {
                const barangay = locationBarangays.find((item) => item.code === e.target.value);
                if (barangay) setForm((prev) => ({ ...prev, name: barangay.name }));
              }} disabled={!canEdit || !selectedCity}>
                <option value="">— choose barangay —</option>
                {locationBarangays.map((barangay) => <option key={barangay.code} value={barangay.code}>{barangay.name}</option>)}
              </FormField>
            </div>

            <FormField
              label="Province"
              placeholder="e.g. Metro Manila / Isabela"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              disabled={!canEdit}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                label="Contact Email"
                type="email"
                placeholder="barangay@example.gov.ph"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                disabled={!canEdit}
              />
              <FormField
                label="Contact Mobile / Landline"
                placeholder="09171234567 or (02) 8123-4567"
                value={form.contact_number}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-emerald px-6 py-3">
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes…' : `Save ${officeLabel} Branding`}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
