(function (window) {
    function bnNum(input) {
        const en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(input ?? '').replace(/[0-9]/g, function (c) {
            const idx = en.indexOf(c);
            return idx >= 0 ? bn[idx] : c;
        });
    }

    function enNum(input) {
        const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(input ?? '').replace(/[০-৯]/g, function (c) {
            const idx = bn.indexOf(c);
            return idx >= 0 ? String(idx) : c;
        });
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safePhotoUrl(rawUrl) {
        const val = String(rawUrl || '').trim();
        if (!val) return '/logo.png';
        if (val.startsWith('/') && !val.startsWith('//')) return val;
        if (/^https?:\/\//i.test(val)) return val;
        if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(val)) return val;
        return '/logo.png';
    }

    /**
     * Attaches automatic Class dropdown + Auto Roll List + Direct Roll Input behavior.
     * Options:
     *   classSelect: HTMLSelectElement
     *   rollInput: HTMLInputElement
     *   rollAutoSelect: HTMLSelectElement (optional auto-list dropdown inside roll field)
     *   rollListWrap: HTMLElement (optional container for roll auto-list)
     *   rollChipsContainer: HTMLElement (optional clickable roll chips list)
     *   rollDatalist: HTMLDataListElement (optional)
     *   preserveExistingClassOptions: boolean (if true, keeps existing optgroups like result.ejs)
     *   onRollPicked: function(rollObj) (optional callback when roll chosen from auto list)
     */
    async function attachClassRollPicker(opts) {
        const classSelect = opts.classSelect;
        const rollInput = opts.rollInput;
        const rollAutoSelect = opts.rollAutoSelect;
        const rollListWrap = opts.rollListWrap;
        const rollChipsContainer = opts.rollChipsContainer;
        const rollDatalist = opts.rollDatalist;
        const rollCountBadge = opts.rollCountBadge;

        if (!classSelect || !rollInput) return null;

        let currentRolls = [];

        if (!opts.preserveExistingClassOptions) {
            try {
                let data = null;
                if (typeof navigator !== 'undefined' && navigator.onLine) {
                    const res = await fetch('/api/portal/classes-and-rolls');
                    if (res.ok) data = await res.json();
                }
                if (!data && window.NadufmOffline) {
                    data = await window.NadufmOffline.getClassesAndRolls('');
                }
                if (data && Array.isArray(data.classes) && data.classes.length) {
                    const prevVal = classSelect.value;
                    const placeholder = classSelect.querySelector('option[value=""]')?.outerHTML || '<option value="">-- শ্রেণি নির্বাচন করুন --</option>';
                    classSelect.innerHTML = placeholder + data.classes.map(function (c) {
                        const countText = c.count > 0 ? ' (' + bnNum(c.count) + ' জন)' : '';
                        return '<option value="' + escapeHtml(c.value) + '">' + escapeHtml(c.label + countText) + '</option>';
                    }).join('');
                    if (prevVal) classSelect.value = prevVal;
                }
            } catch (_) {
                if (window.NadufmOffline) {
                    const offData = await window.NadufmOffline.getClassesAndRolls('').catch(function () { return null; });
                    if (offData && Array.isArray(offData.classes) && offData.classes.length) {
                        const prevVal = classSelect.value;
                        const placeholder = classSelect.querySelector('option[value=""]')?.outerHTML || '<option value="">-- শ্রেণি নির্বাচন করুন --</option>';
                        classSelect.innerHTML = placeholder + offData.classes.map(function (c) {
                            const countText = c.count > 0 ? ' (' + bnNum(c.count) + ' জন)' : '';
                            return '<option value="' + escapeHtml(c.value) + '">' + escapeHtml(c.label + countText) + '</option>';
                        }).join('');
                        if (prevVal) classSelect.value = prevVal;
                    }
                }
            }
        }

        function renderRolls(rolls, hasClassSelected) {
            currentRolls = Array.isArray(rolls) ? rolls : [];
            const queryNorm = enNum(String(rollInput.value || '').trim()).toLowerCase();

            if (rollCountBadge) {
                rollCountBadge.textContent = currentRolls.length > 0
                    ? bnNum(currentRolls.length) + ' জন'
                    : (hasClassSelected ? 'তালিকা খালি' : '');
            }

            if (rollListWrap) {
                rollListWrap.style.display = hasClassSelected ? 'block' : 'none';
            }

            if (rollDatalist) {
                rollDatalist.innerHTML = currentRolls.map(function (r) {
                    return '<option value="' + escapeHtml(r.roll) + '">' + escapeHtml('রোল ' + r.rollBn + ' - ' + r.name) + '</option>';
                }).join('');
            }

            if (rollAutoSelect) {
                if (!hasClassSelected) {
                    rollAutoSelect.innerHTML = '<option value="">প্রথমে শ্রেণি নির্বাচন করুন</option>';
                } else if (currentRolls.length === 0) {
                    rollAutoSelect.innerHTML = '<option value="">এই শ্রেণিতে সংরক্ষিত রোল তালিকা নেই (রোল সরাসরি লিখুন)</option>';
                } else {
                    rollAutoSelect.innerHTML = '<option value="">-- রোল তালিকা থেকে বেছে নিন (' + bnNum(currentRolls.length) + ' জন) --</option>' +
                        currentRolls.map(function (r) {
                            const extra = r.id ? ' [' + r.id + ']' : '';
                            return '<option value="' + escapeHtml(r.roll) + '">রোল ' + escapeHtml(r.rollBn) + ' — ' + escapeHtml(r.name) + escapeHtml(extra) + '</option>';
                        }).join('');
                }
            }

            if (rollChipsContainer) {
                if (!hasClassSelected || currentRolls.length === 0) {
                    rollChipsContainer.innerHTML = hasClassSelected
                        ? '<span class="roll-empty-note">এই শ্রেণির কোনো রোল এখনও সংরক্ষিত হয়নি — উপরে রোল নম্বর লিখে খুঁজুন।</span>'
                        : '';
                } else {
                    const filtered = currentRolls.filter(function (r) {
                        if (!queryNorm) return true;
                        const rNorm = enNum(r.roll).toLowerCase();
                        const nameNorm = String(r.name || '').toLowerCase();
                        return rNorm.includes(queryNorm) || nameNorm.includes(queryNorm);
                    }).slice(0, 60);

                    if (filtered.length === 0) {
                        rollChipsContainer.innerHTML = '<span class="roll-empty-note">মিলে এমন কোনো রোল তালিকায় নেই — সরাসরি লিখে সাবমিট করতে পারেন।</span>';
                    } else {
                        rollChipsContainer.innerHTML = filtered.map(function (r) {
                            const isActive = enNum(r.roll).toLowerCase() === queryNorm && queryNorm !== '';
                            return '<button type="button" class="roll-chip-btn' + (isActive ? ' active' : '') + '" data-roll="' + escapeHtml(r.roll) + '">' +
                                '<strong>' + escapeHtml(r.rollBn) + '</strong><span>' + escapeHtml(r.name) + '</span>' +
                                '</button>';
                        }).join('');
                    }
                }
            }
        }

        async function loadRollsForClass(clsVal) {
            const val = String(clsVal || '').trim();
            if (!val) {
                renderRolls([], false);
                return [];
            }
            try {
                if (typeof navigator === 'undefined' || navigator.onLine) {
                    const res = await fetch('/api/portal/classes-and-rolls?class=' + encodeURIComponent(val));
                    if (res.ok) {
                        const data = await res.json();
                        renderRolls(data.rolls || [], true);
                        return data.rolls || [];
                    }
                }
            } catch (_) {
                // Fall back to offline snapshot below
            }
            if (window.NadufmOffline) {
                try {
                    const offData = await window.NadufmOffline.getClassesAndRolls(val);
                    if (offData && Array.isArray(offData.rolls)) {
                        renderRolls(offData.rolls, true);
                        return offData.rolls;
                    }
                } catch (_) {}
            }
            renderRolls([], true);
            return [];
        }

        classSelect.addEventListener('change', function () {
            loadRollsForClass(classSelect.value);
        });

        if (rollAutoSelect) {
            rollAutoSelect.addEventListener('change', function () {
                const picked = rollAutoSelect.value;
                if (!picked) return;
                rollInput.value = picked;
                renderRolls(currentRolls, Boolean(classSelect.value));
                if (typeof opts.onRollPicked === 'function') {
                    const found = currentRolls.find(function (r) { return r.roll === picked; }) || { roll: picked };
                    opts.onRollPicked(found);
                }
            });
        }

        if (rollChipsContainer) {
            rollChipsContainer.addEventListener('click', function (ev) {
                const btn = ev.target.closest('.roll-chip-btn');
                if (!btn) return;
                const picked = btn.getAttribute('data-roll') || '';
                if (!picked) return;
                rollInput.value = picked;
                if (rollAutoSelect) rollAutoSelect.value = picked;
                renderRolls(currentRolls, Boolean(classSelect.value));
                if (typeof opts.onRollPicked === 'function') {
                    const found = currentRolls.find(function (r) { return r.roll === picked; }) || { roll: picked };
                    opts.onRollPicked(found);
                }
            });
        }

        rollInput.addEventListener('input', function () {
            if (currentRolls.length > 0) {
                renderRolls(currentRolls, Boolean(classSelect.value));
            }
        });

        if (classSelect.value) {
            await loadRollsForClass(classSelect.value);
        }

        return {
            loadRollsForClass: loadRollsForClass,
            getRolls: function () { return currentRolls; },
        };
    }

    const CLASS_OPTION_ALIASES = [
        { key: '0', aliases: ['0', 'শিশু', 'nursery', 'play', 'kg', 'shishu'] },
        { key: '1', aliases: ['1', '১', '১ম', 'প্রথম', '1st', 'one', 'first'] },
        { key: '2', aliases: ['2', '২', '২য়', '২য়', 'দ্বিতীয়', 'দ্বিতীয়', '2nd', 'two', 'second'] },
        { key: '3', aliases: ['3', '৩', '৩য়', '৩য়', 'তৃতীয়', 'তৃতীয়', '3rd', 'three', 'third'] },
        { key: '4', aliases: ['4', '৪', '৪র্থ', 'চতুর্থ', '4th', 'four', 'fourth'] },
        { key: '5', aliases: ['5', '৫', '৫ম', 'পঞ্চম', '5th', 'five', 'fifth', 'এবতেদায়ী সমাপনী'] },
        { key: '6', aliases: ['6', '৬', '৬ষ্ঠ', 'ষষ্ঠ', '6th', 'six', 'sixth'] },
        { key: '7', aliases: ['7', '৭', '৭ম', 'সপ্তম', '7th', 'seven', 'seventh'] },
        { key: '8', aliases: ['8', '৮', '৮ম', 'অষ্টম', '8th', 'eight', 'eighth', 'জেডিসি', 'jdc'] },
        { key: '9', aliases: ['9', '৯', '৯ম', 'নবম', '9th', 'nine', 'ninth'] },
        { key: '10', aliases: ['10', '১০', '১০ম', 'দশম', 'দাখিল', '10th', 'ten', 'tenth', 'dakhil', 'দাখিল দশম'] },
        { key: '11', aliases: ['11', '১১', '১১শ', 'আলিম ১ম', 'আলিম ১ম বর্ষ', 'আলিম প্রথম বর্ষ', 'alim 1st', 'alim 1st year'] },
        { key: '12', aliases: ['12', '১২', '১২শ', 'আলিম ২য়', 'আলিম ২য় বর্ষ', 'আলিম ২য় বর্ষ', 'আলিম ২য়', 'আলিম দ্বিতীয় বর্ষ', 'alim 2nd', 'alim 2nd year'] },
        { key: 'fazil_1', aliases: ['fazil_1', 'ফাজিল ১ম', 'ফাজিল ১ম বর্ষ', 'fazil 1st', 'fazil 1st year'] },
        { key: 'fazil_2', aliases: ['fazil_2', 'ফাজিল ২য়', 'ফাজিল ২য় বর্ষ', 'ফাজিল ২য় বর্ষ', 'fazil 2nd', 'fazil 2nd year'] },
        { key: 'fazil_3', aliases: ['fazil_3', 'ফাজিল ৩য়', 'ফাজিল ৩য় বর্ষ', 'ফাজিল ৩য় বর্ষ', 'fazil 3rd', 'fazil 3rd year'] },
    ];

    function normalizeClassToken(raw) {
        return enNum(String(raw || ''))
            .replace(/শ্রেণি|শ্রেণী|class/gi, '')
            .replace(/[()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function resolveClassOptionValue(selectEl, rawClass) {
        if (!selectEl || !rawClass) return '';
        const raw = String(rawClass).trim();
        if (!raw) return '';
        const options = Array.from(selectEl.options || []).filter(function (o) { return Boolean(o.value); });

        // 1. Exact option value match
        const exact = options.find(function (o) { return o.value === raw; });
        if (exact) return exact.value;

        // 2. Strip excel: or excel:exam_class_ prefix
        const stripped = raw.replace(/^excel:(?:exam_class_)?/i, '').trim();
        const byStripped = options.find(function (o) {
            return o.value === stripped || o.value.toLowerCase() === stripped.toLowerCase();
        });
        if (byStripped) return byStripped.value;

        // 3. Alias canonical key match (e.g. "ষষ্ঠ শ্রেণি", "6", "ষষ্ঠ")
        const token = normalizeClassToken(stripped);
        let canonicalKey = '';
        for (let i = 0; i < CLASS_OPTION_ALIASES.length; i++) {
            const entry = CLASS_OPTION_ALIASES[i];
            if (entry.aliases.some(function (al) { return normalizeClassToken(al) === token; })) {
                canonicalKey = entry.key;
                break;
            }
        }
        if (canonicalKey) {
            const byCanon = options.find(function (o) { return o.value === canonicalKey; });
            if (byCanon) return byCanon.value;
        }

        // 4. Text / normalized text match
        const byText = options.find(function (o) {
            const txt = normalizeClassToken(o.textContent || '');
            return txt && token && (txt === token || txt.includes(token) || (canonicalKey && txt.includes(canonicalKey)));
        });
        return byText ? byText.value : '';
    }

    window.NadufmStudentPicker = {
        bnNum: bnNum,
        enNum: enNum,
        escapeHtml: escapeHtml,
        safePhotoUrl: safePhotoUrl,
        resolveClassOptionValue: resolveClassOptionValue,
        attachClassRollPicker: attachClassRollPicker,
    };
})(window);
