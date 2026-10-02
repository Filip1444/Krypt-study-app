// UI translations. Stored notes, subjects, tasks, and flashcard content remain untouched.
(() => {
  const croatian = {
    'English': 'Engleski', 'LANGUAGE': 'JEZIK', 'Settings': 'Postavke',
    'GRADING SYSTEM': 'SUSTAV OCJENJIVANJA',
    'F–A (F worst)': 'F–A (F najlošija)',
    '1–5 (1 worst)': '1–5 (1 najlošija)',
    '5–1 (5 worst)': '5–1 (5 najlošija)',
    '1–10 (1 worst)': '1–10 (1 najlošija)',
    '10–1 (10 worst)': '10–1 (10 najlošija)',
    'SUBJECTS': 'PREDMETI', '+ Add Subject': '+ Dodaj predmet', 'Subject name...': 'Naziv predmeta...',
    'Dashboard': 'Nadzorna ploča', 'Notes': 'Bilješke', 'Tasks': 'Zadaci', 'Timer': 'Mjerač vremena',
    'Flashcards': 'Kartice za učenje', 'Grades': 'Ocjene', 'Schedule': 'Raspored', 'Progress': 'Napredak',
    'day streak': 'dana zaredom', '1 Pomodoro or flashcard session': '1 Pomodoro ili učenje s karticama',
    'Goal complete!': 'Cilj ostvaren!',
    'THEME': 'TEMA', 'Dark': 'Tamna', 'Light': 'Svijetla', 'ACCENT COLOR': 'BOJA NAGLASKA',
    'Custom': 'Prilagođeno', 'DATA & BACKUPS': 'PODACI I SIGURNOSNE KOPIJE',
    'Create backup / export data': 'Izradi kopiju / izvezi podatke',
    'Restore / import data': 'Vrati / uvezi podatke', 'Open data folder': 'Otvori mapu s podacima',
    'Choose data folder': 'Odaberi mapu s podacima',
    'Changes could not be saved. Check the data folder and available disk space.': 'Promjene nije moguće spremiti. Provjerite mapu s podacima i slobodan prostor.',
    'Retry save': 'Pokušaj ponovno spremiti', 'Open data folder': 'Otvori mapu s podacima',
    'New flashcard': 'Nova kartica', 'Edit flashcard': 'Uredi karticu', 'Save Changes': 'Spremi promjene',
    'Reset review progress': 'Poništi napredak ponavljanja',
    'KRYPT keeps up to 10 recent automatic snapshots in this folder.': 'KRYPT u ovoj mapi čuva do 10 nedavnih automatskih kopija.',
    'KEYBOARD SHORTCUTS': 'TIPKOVNI PREČACI', 'Save current note': 'Spremi trenutačnu bilješku',
    'New note / new flashcard': 'Nova bilješka / nova kartica',
    'Bold / Italic / Underline': 'Podebljano / Kurziv / Podcrtano',
    'Undo / Redo (in editor)': 'Poništi / Ponovi (u uređivaču)',
    'Flip flashcard': 'Okreni karticu', 'Rate flashcard — Again / Good': 'Ocijeni karticu — Ponovi / Znam',
    'Saved data needs recovery': 'Spremljene podatke treba oporaviti',
    'Restore a backup file or start a new workspace. KRYPT will not save over the unreadable files until you choose.': 'Vratite sigurnosnu kopiju ili otvorite novi radni prostor. KRYPT neće prepisati nečitljive datoteke dok ne odaberete.',
    'Restore backup file': 'Vrati sigurnosnu kopiju', 'Start empty workspace': 'Započni prazan radni prostor',
    'Dismiss recovery notice': 'Zatvori obavijest o oporavku', 'Close settings': 'Zatvori postavke',
    'Undo': 'Poništi', 'Rename': 'Preimenuj', '✎  Rename': '✎  Preimenuj',
    '✕  Delete': '✕  Izbriši', '✕ Delete': '✕ Izbriši', 'Delete': 'Izbriši',
    '▤  Move to Group': '▤  Premjesti u grupu', 'Delete image': 'Izbriši sliku',
    'Delete?': 'Izbrisati?', 'Delete Subject': 'Izbriši predmet',
    'Delete File': 'Izbriši datoteku', 'Delete Files': 'Izbriši datoteke',
    'Cancel': 'Odustani', 'Confirm': 'Potvrdi',
    'Quick Create Flashcard': 'Brzo izradi karticu', 'FRONT (QUESTION)': 'PREDNJA STRANA (PITANJE)',
    'BACK (ANSWER)': 'STRAŽNJA STRANA (ODGOVOR)', 'FRONT': 'PREDNJA STRANA', 'BACK': 'STRAŽNJA STRANA',
    'Question or term...': 'Pitanje ili pojam...', 'Answer or definition...': 'Odgovor ili definicija...',
    'Save Card': 'Spremi karticu', '🃏 Make Flashcard': '🃏 Izradi karticu',
    'FOCUS TIMER': 'MJERAČ FOKUSA', 'Pomodoro session': 'Pomodoro sesija',
    'TASKS REMAINING': 'PREOSTALI ZADACI', 'for this subject': 'za ovaj predmet',
    'NEXT TEST': 'SLJEDEĆI ISPIT', 'No upcoming tests': 'Nema nadolazećih ispita',
    'NOTE FILES': 'DATOTEKE BILJEŠKI', 'in this subject': 'u ovom predmetu',
    'Search notes...': 'Pretraži bilješke...', 'All subjects': 'Svi predmeti',
    '+ New File': '+ Nova datoteka', 'No files yet. Create one above.': 'Još nema datoteka. Izradite jednu iznad.',
    'No files match your search.': 'Nema datoteka koje odgovaraju pretrazi.',
    'No files match your search in any subject.': 'Nema datoteka koje odgovaraju pretrazi ni u jednom predmetu.',
    'Select all': 'Odaberi sve', 'Deselect all': 'Poništi odabir', '← Back': '← Natrag',
    'Untitled': 'Bez naslova', '⛶ Focus': '⛶ Fokus', '⛶ Unfocus': '⛶ Zatvori fokus',
    'saved': 'spremljeno', 'Saving...': 'Spremanje...', 'Saved locally': 'Spremljeno lokalno',
    'Start writing...': 'Počnite pisati...', 'Toggle Focus Mode': 'Uključi ili isključi način fokusa',
    'Bold': 'Podebljano', 'Italic': 'Kurziv', 'Underline': 'Podcrtano',
    'Undo (Ctrl+Z)': 'Poništi (Ctrl+Z)', 'Redo (Ctrl+Y)': 'Ponovi (Ctrl+Y)',
    'Insert symbol': 'Umetni simbol', 'Insert image': 'Umetni sliku',
    'Greek': 'Grčka slova', 'Math': 'Matematika', 'Arrows': 'Strelice', 'Misc': 'Ostalo',
    'Align left': 'Poravnaj lijevo', 'Align center': 'Poravnaj po sredini',
    'Align right': 'Poravnaj desno', 'Justify': 'Obostrano poravnaj',
    '+ New Group': '+ Nova grupa', 'New Group Name': 'Naziv nove grupe',
    'Rename Subject': 'Preimenuj predmet', 'Rename File': 'Preimenuj datoteku',
    'Move to Group': 'Premjesti u grupu',
    'Kanban Board': 'Kanban ploča', 'List View': 'Prikaz popisa',
    'Add a new task...': 'Dodajte novi zadatak...', 'No repeat': 'Bez ponavljanja',
    'Repeat daily': 'Ponavljaj dnevno', 'Repeat weekly': 'Ponavljaj tjedno',
    'Repeat': 'Ponavljanje', 'Add': 'Dodaj', 'No tasks yet.': 'Još nema zadataka.',
    'To Do': 'Za napraviti', 'In Progress': 'U tijeku', 'Completed': 'Dovršeno',
    'Empty': 'Prazno', '↻ daily': '↻ dnevno', '↻ weekly': '↻ tjedno',
    'Move left': 'Premjesti lijevo', 'Move right': 'Premjesti desno',
    'Focus': 'Fokus', 'Pomodoro': 'Pomodoro', 'Short Break': 'Kratka pauza',
    'Long Break': 'Duga pauza', 'Start': 'Pokreni', 'Pause': 'Pauziraj',
    'Reset': 'Resetiraj', 'Sessions today:': 'Današnje sesije:',
    'Review': 'Ponavljaj', 'Review All': 'Ponovi sve', '+ New Card': '+ Nova kartica',
    'NEW CARDS': 'NOVE KARTICE', 'DUE FOR REVIEW': 'ZA PONAVLJANJE',
    'TOTAL DECK': 'UKUPNO KARTICA', 'GROUP (OPTIONAL)': 'GRUPA (NEOBAVEZNO)',
    'e.g. Chapter 3': 'npr. Poglavlje 3', 'No cards yet. Add one above.': 'Još nema kartica. Dodajte jednu iznad.',
    'Flip card': 'Okreni karticu', 'Again': 'Ponovi', 'Good': 'Znam', 'Space': 'Razmaknica',
    'Session complete!': 'Sesija završena!', 'Back to deck': 'Natrag na kartice',
    'AVERAGE': 'PROSJEK', 'HIGHEST': 'NAJVIŠA', 'LOWEST': 'NAJNIŽA',
    'VS TARGET': 'U ODNOSU NA CILJ', 'Target grade': 'Ciljana ocjena',
    'Assessment name...': 'Naziv provjere...', 'Select grade': 'Odaberi ocjenu',
    'No target': 'Bez cilja', 'Grade': 'Ocjena',
    'Percent (optional)': 'Postotak (neobavezno)',
    'Set': 'Postavi', 'No grades yet. Add one above.': 'Još nema ocjena. Dodajte jednu iznad.',
    'Not graded': 'Nije ocijenjeno', '✓ On target': '✓ Cilj ostvaren',
    'Upcoming': 'Nadolazeće', 'Test Schedule': 'Raspored ispita',
    '+ Add Test': '+ Dodaj ispit', 'Subject': 'Predmet', 'Test / Exam name': 'Naziv testa / ispita',
    'No tests scheduled.': 'Nema zakazanih ispita.', 'Today!': 'Danas!', 'Past': 'Prošlo',
    'Overview': 'Pregled', '🔥 Current Streak': '🔥 Trenutačni niz',
    '📅 Total Days Studied': '📅 Ukupno dana učenja',
    '🃏 Total Flashcards': '🃏 Ukupno kartica', '🎯 Cards Mastered': '🎯 Usvojene kartice',
    'days in a row': 'dana zaredom', 'all time': 'ukupno',
    'across all subjects': 'u svim predmetima', 'interval 21+ days': 'razmak 21+ dan',
    'Retention — Last 14 Days': 'Pamćenje — posljednjih 14 dana',
    'No flashcard reviews yet.': 'Još nema ponavljanja kartica.',
    'Last 30 Days': 'Posljednjih 30 dana', 'No study': 'Bez učenja', 'Goal met': 'Cilj ostvaren',
    'Options': 'Mogućnosti', 'Resize sidebar': 'Promijeni širinu bočne trake',
    'Something went wrong. Your latest change may not be saved.': 'Došlo je do pogreške. Posljednja promjena možda nije spremljena.',
    'Failed to save — check disk space or permissions.': 'Spremanje nije uspjelo — provjerite prostor na disku i dozvole.',
    'KRYPT data restored.': 'Podaci KRYPT-a vraćeni su.',
    'Choose a recovery option before saving or exporting data.': 'Prije spremanja ili izvoza podataka odaberite način oporavka.',
    'Could not save current changes before creating the backup.': 'Promjene nisu spremljene prije izrade sigurnosne kopije.',
    'Backup exported successfully.': 'Sigurnosna kopija uspješno je izvezena.',
    'KRYPT could not save the new workspace. Check folder permissions or disk space.': 'KRYPT nije uspio spremiti novi radni prostor. Provjerite dozvole mape i prostor na disku.',
    'Started a new workspace. The unreadable files remain in the data folder.': 'Započet je novi radni prostor. Nečitljive datoteke ostale su u mapi s podacima.',
    'Choose a recovery option before changing the data folder.': 'Prije promjene mape s podacima odaberite način oporavka.',
    'Could not save current changes before changing the data folder.': 'Promjene nisu spremljene prije promjene mape s podacima.',
    'Data folder changed. Current workspace was copied there.': 'Mapa s podacima promijenjena je. Trenutačni radni prostor kopiran je u nju.',
    'There is no readable KRYPT data to export.': 'Nema čitljivih podataka KRYPT-a za izvoz.',
    'This file is not a valid KRYPT data export.': 'Ova datoteka nije valjani izvoz podataka KRYPT-a.',
    'KRYPT could not save the imported data.': 'KRYPT nije uspio spremiti uvezene podatke.',
    'That folder already contains KRYPT data. Choose an empty folder to avoid replacing another workspace.': 'Ta mapa već sadrži podatke KRYPT-a. Odaberite praznu mapu kako ne biste zamijenili drugi radni prostor.',
    'The main data file is missing.': 'Glavna podatkovna datoteka nedostaje.',
    'Check the main data file.': 'Provjerite glavnu podatkovnu datoteku.',
    'Neither the main data file nor its backup could be read.': 'Nije moguće pročitati glavnu podatkovnu datoteku ni sigurnosnu kopiju.',
    'The main data file could not be read and no backup is available.': 'Glavna podatkovna datoteka nije čitljiva i nema sigurnosne kopije.',
    'KRYPT could not access its saved data.': 'KRYPT ne može pristupiti spremljenim podacima.',
    'That subject name is reserved.': 'Taj naziv predmeta je rezerviran.',
    'You need at least one subject.': 'Potreban je barem jedan predmet.',
    'File name cannot be empty.': 'Naziv datoteke ne može biti prazan.',
    'Please fill in both front and back fields.': 'Ispunite obje strane kartice.',
    'Flashcard created! 🃏': 'Kartica je izrađena! 🃏',
    'Please enter a task name.': 'Unesite naziv zadatka.',
    'Please fill in subject, name and date.': 'Unesite predmet, naziv i datum.',
    'Please enter an assessment name.': 'Unesite naziv provjere.',
    'Please select a grade.': 'Odaberite ocjenu.',
    'Enter a percentage from 0 to 100, or leave it blank.': 'Unesite postotak od 0 do 100 ili ostavite polje praznim.',
    'Enter valid points — e.g. 45 out of 60.': 'Unesite valjane bodove — npr. 45 od 60.',
    "Achieved points can't exceed max points.": 'Osvojeni bodovi ne mogu premašiti maksimalne bodove.',
    'Image is too large (max 8MB). Please choose a smaller file.': 'Slika je prevelika (najviše 8 MB). Odaberite manju datoteku.',
    'Failed to read image file.': 'Čitanje slike nije uspjelo.',
    'Task deleted': 'Zadatak izbrisan', 'Test deleted': 'Ispit izbrisan',
    'Flashcard deleted': 'Kartica izbrisana', 'Grade entry deleted': 'Ocjena izbrisana',
    '🔥 7 day streak!': '🔥 Niz od 7 dana!', '💪 2 week streak!': '💪 Niz od 2 tjedna!',
    '🏆 30 day streak!': '🏆 Niz od 30 dana!', '⚡ 60 days!': '⚡ 60 dana!',
    '👑 100 day streak!': '👑 Niz od 100 dana!'
  }

  const plural = new Intl.PluralRules('hr-HR')
  function hrCount(count, one, few, other) {
    return [one, few, other][({ one: 0, few: 1, other: 2 })[plural.select(Number(count))]]
  }
  function translate(source) {
    if (language !== 'hr') return source
    if (Object.hasOwn(croatian, source)) return croatian[source]
    let match
    if ((match = /^(\d+) characters · (\d+) words$/.exec(source))) return `${match[1]} ${hrCount(match[1], 'znak', 'znaka', 'znakova')} · ${match[2]} ${hrCount(match[2], 'riječ', 'riječi', 'riječi')}`
    if ((match = /^(\d+) characters$/.exec(source))) return `${match[1]} ${hrCount(match[1], 'znak', 'znaka', 'znakova')}`
    if ((match = /^(\d+) files? selected$/.exec(source))) return `${match[1]} ${hrCount(match[1], 'odabrana datoteka', 'odabrane datoteke', 'odabranih datoteka')}`
    if ((match = /^(\d+) files? deleted$/.exec(source))) return `${match[1]} ${hrCount(match[1], 'izbrisana datoteka', 'izbrisane datoteke', 'izbrisanih datoteka')}`
    if ((match = /^(\d+) cards? reviewed$/.exec(source))) return `${match[1]} ${hrCount(match[1], 'ponovljena kartica', 'ponovljene kartice', 'ponovljenih kartica')}`
    if ((match = /^Review \((\d+) due\)$/.exec(source))) return `Ponavljaj (${match[1]} za ponavljanje)`
    if ((match = /^Review All \((\d+)\)$/.exec(source))) return `Ponovi sve (${match[1]})`
    if (source === 'Review (none due)') return 'Ponavljaj (ništa za ponavljanje)'
    if ((match = /^In (-?\d+) days?$/.exec(source))) return `Za ${match[1]} ${Number(match[1]) === 1 ? 'dan' : 'dana'}`
    if ((match = /^In (-?\d+) days? — (.*)$/.exec(source))) return `Za ${match[1]} ${Number(match[1]) === 1 ? 'dan' : 'dana'} — ${match[2]}`
    if ((match = /^Today! — (.*)$/.exec(source))) return `Danas! — ${match[1]}`
    if ((match = /^\+(\d+(?:\.\d+)?)% needed$/.exec(source))) return `Potrebno još ${match[1]}%`
    if ((match = /^Need (.*)$/.exec(source))) return `Potrebna ocjena ${match[1]}`
    if ((match = /^Average (.*) meets target (.*)$/.exec(source))) return `Prosjek ${match[1]} zadovoljava cilj ${match[2]}`
    if ((match = /^Current average (.*)$/.exec(source))) return `Trenutačni prosjek ${match[1]}`
    if ((match = /^You're (\d+(?:\.\d+)?)% above your (\d+(?:\.\d+)?)% goal$/.exec(source))) return `${match[1]}% iznad cilja od ${match[2]}%`
    if ((match = /^(\d+(?:\.\d+)?)% below your (\d+(?:\.\d+)?)% target$/.exec(source))) return `${match[1]}% ispod cilja od ${match[2]}%`
    if ((match = /^Subject "(.*)" deleted$/.exec(source))) return `Predmet „${match[1]}” izbrisan`
    if ((match = /^Delete "(.*)" and all its notes, tasks, flashcards and grades\? This cannot be undone\.$/.exec(source))) return `Izbrisati „${match[1]}” i sve njegove bilješke, zadatke, kartice i ocjene? Ova se radnja ne može poništiti.`
    if ((match = /^Delete (\d+) files?\? This cannot be undone\.$/.exec(source))) return `Izbrisati ${match[1]} ${hrCount(match[1], 'datoteku', 'datoteke', 'datoteka')}? Ova se radnja ne može poništiti.`
    if ((match = /^Delete "(.*)"\? This cannot be undone\.$/.exec(source))) return `Izbrisati „${match[1]}”? Ova se radnja ne može poništiti.`
    if ((match = /^"(.*)" deleted$/.exec(source))) return `„${match[1]}” izbrisano`
    if ((match = /^"(.*)" already exists\.$/.exec(source))) return `„${match[1]}” već postoji.`
    if ((match = /^(.*): no reviews$/.exec(source))) return `${match[1]}: nema ponavljanja`
    if ((match = /^(.*) — studied ✓$/.exec(source))) return `${match[1]} — učeno ✓`
    if ((match = /^Backup failed: (.*)$/.exec(source))) return `Izrada sigurnosne kopije nije uspjela: ${match[1]}`
    if ((match = /^KRYPT recovered the backup\. (.*)$/.exec(source))) return `KRYPT je oporavio sigurnosnu kopiju. ${translate(match[1])}`
    return source
  }

  let language = 'en'
  const originalText = new WeakMap()
  const originalAttributes = new WeakMap()
  const userContent = '#notesArea, #subjectList .subject-btn, #fileList .file-name, #fileList .file-meta, .group-chip[data-group], .task-user-text, .kanban-user-text, .fc-front, .fc-back, .grade-entry-name, .test-name, .test-subject, #fcCardFront, #fcCardBack, #editorFilename, #dashNextTest, #dashSubjectLabel, #notesSubjectLabel, #editorSubjectLabel, #tasksSubjectLabel, #fcSubjectLabel, #gradesSubjectLabel'

  function excluded(element) {
    return element && element.closest(userContent)
  }
  function updateText(node) {
    if (!node.parentElement || excluded(node.parentElement) || !node.data.trim()) return
    let entry = originalText.get(node)
    if (!entry || node.data !== entry.rendered) entry = { source: node.data, rendered: node.data }
    const trimmed = entry.source.trim()
    const result = translate(trimmed)
    const rendered = result === trimmed ? entry.source : entry.source.replace(trimmed, result)
    entry.rendered = rendered
    originalText.set(node, entry)
    if (node.data !== rendered) node.data = rendered
  }
  const attributes = ['placeholder', 'title', 'aria-label', 'data-placeholder']
  function updateAttributes(element) {
    if (excluded(element) && element.id !== 'notesArea') return
    let entries = originalAttributes.get(element)
    if (!entries) { entries = {}; originalAttributes.set(element, entries) }
    for (const name of attributes) {
      if (!element.hasAttribute(name)) continue
      const current = element.getAttribute(name)
      let entry = entries[name]
      if (!entry || current !== entry.rendered) entry = { source: current, rendered: current }
      const rendered = translate(entry.source)
      entry.rendered = rendered
      entries[name] = entry
      if (current !== rendered) element.setAttribute(name, rendered)
    }
  }
  function updateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) { updateText(root); return }
    if (root.nodeType !== Node.ELEMENT_NODE || excluded(root)) return
    updateAttributes(root)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) updateText(walker.currentNode)
    for (const element of root.querySelectorAll('[placeholder], [title], [aria-label], [data-placeholder]')) updateAttributes(element)
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') updateText(record.target)
      else if (record.type === 'attributes') updateAttributes(record.target)
      else for (const node of record.addedNodes) updateTree(node)
    }
  })
  function setLanguage(value) {
    language = value === 'hr' ? 'hr' : 'en'
    document.documentElement.lang = language
    updateTree(document.body)
  }
  function start() {
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes })
  }
  window.KryptI18n = { start, setLanguage, translate }
})()
