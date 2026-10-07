'use strict';
const {Plugin,ItemView,PluginSettingTab,Setting,Modal,Notice,Menu,TFile,normalizePath,parseYaml,stringifyYaml,getLanguage}=require('obsidian');
const C=(()=>{const module={exports:{}};
'use strict';
const VERSION = '2.2.1';
const RECURRENCES = ['none', 'daily', 'weekly', 'monthly'];
const pad = n => String(n).padStart(2, '0');
function iso(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function date(value) {
  if (value instanceof Date) return iso(value);
  const s = String(value || '').slice(0,10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return '';
  const d = new Date(+m[1], +m[2]-1, +m[3], 12);
  return iso(d) === s ? s : '';
}
function asDate(s) { const [y,m,d]=date(s).split('-').map(Number); return new Date(y,m-1,d,12); }
function key(v) {
  const s=String(v?.path || v || '').trim();
  const m=/^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/.exec(s);
  return (m ? m[1] : s).replace(/\.md$/i,'');
}
function yes(v) { return v === true || v === 'true'; }
function normalize(fm, path, body='') {
  const completed=fm.completed === undefined ? (!!fm.completedAt || fm.stage==='done') : yes(fm.completed);
  return {...fm, path, body, title:String(fm.title || fm.name || path.split('/').pop().replace(/\.md$/,'')),
    date:date(fm.date || fm.planned), completed, completedAt:date(fm.completedAt) || (completed ? date(fm.date) : ''),
    archived:yes(fm.archived), recurrence:fm.recurrence || 'none', project:fm.project || '',
    priority:['high','medium','low'].includes(fm.priority)?fm.priority:'medium',
    sortOrder:Number(fm.sortOrder)||0,
    subtasks:Array.isArray(fm.subtasks)?fm.subtasks.map(x=>typeof x==='string'?{text:x,done:false}:{...x,text:String(x?.text||''),done:yes(x?.done)}):[]};
}
function bucket(task, today=iso()) { return task.completed ? 'done' : task.date && task.date<=today ? 'today' : 'backlog'; }
function nextOccurrence(task, today=iso()) {
  const rec=task.recurrence;
  if (!RECURRENCES.includes(rec) || rec==='none') return '';
  const scheduled=date(task.mptScheduled) || date(task.date) || date(task.mptAnchor) || today;
  const anchor=date(task.mptAnchor) || scheduled;
  const threshold=scheduled>today?scheduled:today;
  const base=asDate(anchor), end=asDate(threshold);
  if (rec==='monthly') {
    let months=(end.getFullYear()-base.getFullYear())*12+end.getMonth()-base.getMonth();
    months=Math.max(0,months);
    const at=n=>{const d=new Date(base.getFullYear(),base.getMonth()+n,1,12);d.setDate(Math.min(base.getDate(),new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return iso(d);};
    while(at(months)<=threshold) months++;
    return at(months);
  }
  const interval=rec==='weekly'?7:1;
  const utc=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  const days=Math.round((utc(end)-utc(base))/86400000);
  const steps=Math.max(1,Math.floor(days/interval)+1);
  base.setDate(base.getDate()+steps*interval);
  return iso(base);
}
function movement(task, target, today=iso(), restore=false) {
  if(restore) return {completed:false,completedAt:'',archived:false,archivedAt:'',...(task.mptNextId?{recurrence:'none'}:{})};
  if(bucket(task,today)===target) return {};
  if(target==='done') return {completed:true,completedAt:today};
  return {completed:false,completedAt:'',date:target==='today'?today:'',archived:false,archivedAt:'',
    ...(task.completed&&task.mptNextId?{recurrence:'none'}:{})};
}
function safeName(s) {return String(s||'Task').replace(/[\\/:*?"<>|#^[\]]/g,'-').replace(/\s+/g,' ').replace(/[. ]+$/,'').slice(0,100)||'Task';}
function id() {return globalThis.crypto?.randomUUID?.() || `mpt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;}
module.exports={VERSION,RECURRENCES,iso,date,asDate,key,yes,normalize,bucket,nextOccurrence,movement,safeName,id};

return module.exports;})();
const STRINGS=(()=>{const module={exports:{}};
'use strict';
const strings={
ru:{tasks:'Задачи',projects:'Проекты',backlog:'Бэклог',today:'Сегодня',done:'Выполнено',newTask:'+ Задача',newProject:'+ Проект',empty:'Нет задач',noProjects:'Проекты не созданы',allProjects:'Все проекты',noProject:'Без проекта',search:'Поиск задач…',manual:'Ручной порядок',byDate:'По дате',byPriority:'По приоритету',high:'Высокий',medium:'Средний',low:'Низкий',overdue:'Просрочено',planned:'На сегодня',future:'Будущие',showMore:'Показать еще',title:'Название',project:'Проект',date:'Плановая дата',priority:'Приоритет',recurrence:'Повторение',none:'Не повторяется',daily:'Каждый день',weekly:'Каждую неделю',monthly:'Каждый месяц',description:'Описание',checklist:'Чек-лист',addItem:'+ Добавить пункт',save:'Сохранить',cancel:'Отмена',delete:'Удалить',edit:'Редактировать',restore:'Вернуть в работу',openNote:'Открыть файл задачи',openSource:'Открыть исходную заметку',complete:'Завершить',toBacklog:'В бэклог',toToday:'На сегодня',plusDay:'+1 день',color:'Цвет',language:'Язык / Language',auto:'Автоматически / Automatic',taskFolder:'Папка задач',projectFolder:'Папка проектов',foldersDesc:'Путь применяется после нажатия «Применить». Файлы автоматически не перемещаются.',apply:'Применить',titleRequired:'Введите название.',dateRequired:'Для включения повторения укажите плановую дату.',badDate:'Некорректная дата.',error:'Операция не выполнена',readError:'Не удалось прочитать файл',conflict:'Файл изменился после открытия формы. Откройте форму заново, чтобы не потерять изменения.',deleteTask:'Удалить задачу?',deleteProject:'Удалить проект?',projectDeleteInfo:'Связанные задачи сохранятся без проекта. Задач: ',deleteInfo:'Файл будет перемещен в корзину. Удаление активного повторения остановит серию.',restoredOnce:'Задача восстановлена как разовая. Продолжение серии сохранено.',repeat:'Повторение',archived:'Из прежнего архива',legacyRepeat:'Неизвестное правило повторения сохранено. Автоматическое продолжение недоступно.',offline:'Free · локальные Markdown-файлы · без регистрации',backup:'Резервные копии перед первым изменением: MyProjectTasksBackups/Free-2.2.0. Исходные файлы не меняются при запуске.',newTaskCommand:'Создать задачу',openCommand:'Открыть My Project Tasks Free',menu:'Действия с задачей',projectMenu:'Действия с проектом',completedAt:'Выполнено',initialError:'Не удалось запустить плагин',pendingError:'Не удалось создать следующее повторение. Оно будет повторно обработано при открытии доски.',invalidFolder:'Укажите разные папки внутри хранилища, без .. и без вложения одной в другую.',loading:'Загрузка…',countOpen:'Активных',countDone:'Выполнено',linkMissing:'Связанная заметка не найдена.',repeatHint:'Следующий экземпляр создается после завершения. Просроченная задача сохраняет дату.',retainedDate:'Дата текущего экземпляра; расписание серии сохраняется.',removeItem:'Удалить пункт',moveUp:'Выше',moveDown:'Ниже',unknownProject:'Проект недоступен',readOnlyHistory:'Повторение в истории не редактируется. Измените активный экземпляр.',dragSorted:'Для ручного перемещения включите «Ручной порядок».',pendingRepair:'Продолжение серии ожидает восстановления.',retry:'Повторить',folderExists:'Путь занят файлом.'},
en:{tasks:'Tasks',projects:'Projects',backlog:'Backlog',today:'Today',done:'Done',newTask:'+ Task',newProject:'+ Project',empty:'No tasks',noProjects:'No projects yet',allProjects:'All projects',noProject:'No project',search:'Search tasks…',manual:'Manual order',byDate:'By date',byPriority:'By priority',high:'High',medium:'Medium',low:'Low',overdue:'Overdue',planned:'Today',future:'Upcoming',showMore:'Show more',title:'Title',project:'Project',date:'Planned date',priority:'Priority',recurrence:'Repeat',none:'Does not repeat',daily:'Every day',weekly:'Every week',monthly:'Every month',description:'Description',checklist:'Checklist',addItem:'+ Add item',save:'Save',cancel:'Cancel',delete:'Delete',edit:'Edit',restore:'Restore task',openNote:'Open task file',openSource:'Open source note',complete:'Complete',toBacklog:'Move to Backlog',toToday:'Plan for today',plusDay:'+1 day',color:'Color',language:'Language / Язык',auto:'Automatic / Автоматически',taskFolder:'Tasks folder',projectFolder:'Projects folder',foldersDesc:'The path is saved with Apply. Existing files are not moved automatically.',apply:'Apply',titleRequired:'Enter a title.',dateRequired:'Set a planned date to enable repetition.',badDate:'Invalid date.',error:'Operation failed',readError:'Could not read file',conflict:'The file changed after you opened this form. Reopen it to avoid losing changes.',deleteTask:'Delete task?',deleteProject:'Delete project?',projectDeleteInfo:'Linked tasks will be kept without a project. Tasks: ',deleteInfo:'The file will be moved to trash. Deleting the active occurrence stops its series.',restoredOnce:'Restored as a one-off task. The series continues separately.',repeat:'Repeat',archived:'From previous archive',legacyRepeat:'Unknown repeat rule preserved. Automatic continuation is unavailable.',offline:'Free · local Markdown files · no account',backup:'Backups before the first edit: MyProjectTasksBackups/Free-2.2.0. Startup does not modify source files.',newTaskCommand:'Create task',openCommand:'Open My Project Tasks Free',menu:'Task actions',projectMenu:'Project actions',completedAt:'Completed',initialError:'Could not initialize plugin',pendingError:'Could not create the next occurrence. Opening the board will retry.',invalidFolder:'Use separate vault-relative folders without ..; neither may contain the other.',loading:'Loading…',countOpen:'Active',countDone:'Done',linkMissing:'Linked note not found.',repeatHint:'The next occurrence is created after completion. Overdue tasks keep their dates.',retainedDate:'Current occurrence date; the series schedule is retained.',removeItem:'Remove item',moveUp:'Move up',moveDown:'Move down',unknownProject:'Unavailable project',readOnlyHistory:'Repeat settings in history are read-only. Edit the active occurrence.',dragSorted:'Select Manual order to reorder tasks.',pendingRepair:'The next occurrence is waiting for recovery.',retry:'Retry',folderExists:'A file already uses this path.'}
};

strings.es={
tasks:'Tareas',projects:'Proyectos',backlog:'Pendientes',today:'Hoy',done:'Completadas',newTask:'+ Tarea',newProject:'+ Proyecto',empty:'No hay tareas',noProjects:'Aún no hay proyectos',allProjects:'Todos los proyectos',noProject:'Sin proyecto',search:'Buscar tareas…',manual:'Orden manual',byDate:'Por fecha',byPriority:'Por prioridad',high:'Alta',medium:'Media',low:'Baja',overdue:'Atrasadas',planned:'Para hoy',future:'Próximas',showMore:'Mostrar más',title:'Título',project:'Proyecto',date:'Fecha planificada',priority:'Prioridad',recurrence:'Repetición',none:'No se repite',daily:'Cada día',weekly:'Cada semana',monthly:'Cada mes',description:'Descripción',checklist:'Lista de verificación',addItem:'+ Añadir elemento',save:'Guardar',cancel:'Cancelar',delete:'Eliminar',edit:'Editar',restore:'Reabrir tarea',openNote:'Abrir archivo de la tarea',openSource:'Abrir nota de origen',complete:'Completar',toBacklog:'Mover a pendientes',toToday:'Planificar para hoy',plusDay:'+1 día',color:'Color',language:'Idioma',auto:'Automático',taskFolder:'Carpeta de tareas',projectFolder:'Carpeta de proyectos',foldersDesc:'La ruta se guarda al pulsar «Aplicar». Los archivos existentes no se mueven automáticamente.',apply:'Aplicar',titleRequired:'Introduce un título.',dateRequired:'Indica una fecha planificada para activar la repetición.',badDate:'Fecha no válida.',error:'No se pudo realizar la operación',readError:'No se pudo leer el archivo',conflict:'El archivo ha cambiado desde que abriste este formulario. Vuelve a abrirlo para no perder los cambios.',deleteTask:'¿Eliminar tarea?',deleteProject:'¿Eliminar proyecto?',projectDeleteInfo:'Las tareas vinculadas se conservarán sin proyecto. Tareas: ',deleteInfo:'El archivo se moverá a la papelera. Eliminar la repetición activa detiene la serie.',restoredOnce:'La tarea se ha reabierto sin repetición. La serie continúa por separado.',repeat:'Repetición',archived:'Del archivo anterior',legacyRepeat:'Se ha conservado una regla de repetición desconocida. No se puede continuar automáticamente.',offline:'Free · archivos Markdown locales · sin cuenta',backup:'Copias antes del primer cambio: MyProjectTasksBackups/Free-2.2.0. El inicio no modifica los archivos de origen.',newTaskCommand:'Crear tarea',openCommand:'Abrir My Project Tasks Free',menu:'Acciones de la tarea',projectMenu:'Acciones del proyecto',completedAt:'Completada',initialError:'No se pudo iniciar el complemento',pendingError:'No se pudo crear la siguiente repetición. Se volverá a intentar al abrir el tablero.',invalidFolder:'Usa carpetas distintas dentro del repositorio, sin .. y sin que una contenga a la otra.',loading:'Cargando…',countOpen:'Activas',countDone:'Completadas',linkMissing:'No se encontró la nota vinculada.',repeatHint:'La siguiente repetición se crea al completar la actual. Las tareas atrasadas conservan su fecha.',retainedDate:'Fecha de la repetición actual; se mantiene el calendario de la serie.',removeItem:'Eliminar elemento',moveUp:'Subir',moveDown:'Bajar',unknownProject:'Proyecto no disponible',readOnlyHistory:'La repetición del historial no se puede editar. Edita la tarea activa.',dragSorted:'Selecciona «Orden manual» para reordenar las tareas.',pendingRepair:'La siguiente repetición está pendiente de recuperación.',retry:'Reintentar',folderExists:'Un archivo ya ocupa esta ruta.'
};
strings.de={
tasks:'Aufgaben',projects:'Projekte',backlog:'Vorrat',today:'Heute',done:'Erledigt',newTask:'+ Aufgabe',newProject:'+ Projekt',empty:'Keine Aufgaben',noProjects:'Noch keine Projekte',allProjects:'Alle Projekte',noProject:'Ohne Projekt',search:'Aufgaben suchen…',manual:'Manuelle Reihenfolge',byDate:'Nach Datum',byPriority:'Nach Priorität',high:'Hoch',medium:'Mittel',low:'Niedrig',overdue:'Überfällig',planned:'Für heute',future:'Anstehend',showMore:'Mehr anzeigen',title:'Titel',project:'Projekt',date:'Geplantes Datum',priority:'Priorität',recurrence:'Wiederholung',none:'Keine Wiederholung',daily:'Täglich',weekly:'Wöchentlich',monthly:'Monatlich',description:'Beschreibung',checklist:'Checkliste',addItem:'+ Eintrag hinzufügen',save:'Speichern',cancel:'Abbrechen',delete:'Löschen',edit:'Bearbeiten',restore:'Wieder öffnen',openNote:'Aufgabendatei öffnen',openSource:'Ursprungsnotiz öffnen',complete:'Erledigen',toBacklog:'In den Vorrat',toToday:'Für heute planen',plusDay:'+1 Tag',color:'Farbe',language:'Sprache',auto:'Automatisch',taskFolder:'Aufgabenordner',projectFolder:'Projektordner',foldersDesc:'Der Pfad wird mit „Übernehmen“ gespeichert. Vorhandene Dateien werden nicht automatisch verschoben.',apply:'Übernehmen',titleRequired:'Bitte einen Titel eingeben.',dateRequired:'Zum Aktivieren der Wiederholung ein geplantes Datum angeben.',badDate:'Ungültiges Datum.',error:'Vorgang fehlgeschlagen',readError:'Datei konnte nicht gelesen werden',conflict:'Die Datei wurde seit dem Öffnen des Formulars geändert. Öffne es erneut, damit keine Änderungen verloren gehen.',deleteTask:'Aufgabe löschen?',deleteProject:'Projekt löschen?',projectDeleteInfo:'Verknüpfte Aufgaben bleiben ohne Projekt erhalten. Aufgaben: ',deleteInfo:'Die Datei wird in den Papierkorb verschoben. Das Löschen der aktiven Wiederholung beendet die Serie.',restoredOnce:'Die Aufgabe wurde als einmalige Aufgabe wieder geöffnet. Die Serie wird getrennt fortgesetzt.',repeat:'Wiederholung',archived:'Aus dem bisherigen Archiv',legacyRepeat:'Unbekannte Wiederholungsregel beibehalten. Eine automatische Fortsetzung ist nicht möglich.',offline:'Free · lokale Markdown-Dateien · ohne Konto',backup:'Sicherung vor der ersten Änderung: MyProjectTasksBackups/Free-2.2.0. Beim Start werden keine Quelldateien geändert.',newTaskCommand:'Aufgabe erstellen',openCommand:'My Project Tasks Free öffnen',menu:'Aufgabenaktionen',projectMenu:'Projektaktionen',completedAt:'Erledigt am',initialError:'Plugin konnte nicht gestartet werden',pendingError:'Die nächste Wiederholung konnte nicht erstellt werden. Beim Öffnen der Übersicht wird es erneut versucht.',invalidFolder:'Verwende getrennte Ordner im Vault ohne ..; keiner darf im anderen liegen.',loading:'Wird geladen…',countOpen:'Offen',countDone:'Erledigt',linkMissing:'Verknüpfte Notiz nicht gefunden.',repeatHint:'Die nächste Wiederholung wird nach Abschluss erstellt. Überfällige Aufgaben behalten ihr Datum.',retainedDate:'Datum der aktuellen Wiederholung; der Serienplan bleibt erhalten.',removeItem:'Eintrag entfernen',moveUp:'Nach oben',moveDown:'Nach unten',unknownProject:'Projekt nicht verfügbar',readOnlyHistory:'Wiederholungen im Verlauf sind schreibgeschützt. Bearbeite die aktive Aufgabe.',dragSorted:'Wähle „Manuelle Reihenfolge“, um Aufgaben umzusortieren.',pendingRepair:'Die nächste Wiederholung wartet auf die Wiederherstellung.',retry:'Erneut versuchen',folderExists:'Dieser Pfad wird bereits von einer Datei verwendet.'
};
strings['pt-BR']={
tasks:'Tarefas',projects:'Projetos',backlog:'Pendentes',today:'Hoje',done:'Concluídas',newTask:'+ Tarefa',newProject:'+ Projeto',empty:'Nenhuma tarefa',noProjects:'Nenhum projeto criado',allProjects:'Todos os projetos',noProject:'Sem projeto',search:'Buscar tarefas…',manual:'Ordem manual',byDate:'Por data',byPriority:'Por prioridade',high:'Alta',medium:'Média',low:'Baixa',overdue:'Atrasadas',planned:'Para hoje',future:'Próximas',showMore:'Mostrar mais',title:'Título',project:'Projeto',date:'Data planejada',priority:'Prioridade',recurrence:'Repetição',none:'Não se repete',daily:'Todos os dias',weekly:'Toda semana',monthly:'Todo mês',description:'Descrição',checklist:'Lista de verificação',addItem:'+ Adicionar item',save:'Salvar',cancel:'Cancelar',delete:'Excluir',edit:'Editar',restore:'Reabrir tarefa',openNote:'Abrir arquivo da tarefa',openSource:'Abrir nota de origem',complete:'Concluir',toBacklog:'Mover para pendentes',toToday:'Planejar para hoje',plusDay:'+1 dia',color:'Cor',language:'Idioma',auto:'Automático',taskFolder:'Pasta de tarefas',projectFolder:'Pasta de projetos',foldersDesc:'O caminho é salvo ao clicar em “Aplicar”. Os arquivos existentes não são movidos automaticamente.',apply:'Aplicar',titleRequired:'Digite um título.',dateRequired:'Defina uma data planejada para ativar a repetição.',badDate:'Data inválida.',error:'Não foi possível concluir a operação',readError:'Não foi possível ler o arquivo',conflict:'O arquivo foi alterado após a abertura deste formulário. Abra-o novamente para não perder as alterações.',deleteTask:'Excluir tarefa?',deleteProject:'Excluir projeto?',projectDeleteInfo:'As tarefas vinculadas serão mantidas sem projeto. Tarefas: ',deleteInfo:'O arquivo será movido para a lixeira. Excluir a ocorrência ativa interrompe a série.',restoredOnce:'A tarefa foi reaberta sem repetição. A série continua separadamente.',repeat:'Repetição',archived:'Do arquivo anterior',legacyRepeat:'Uma regra de repetição desconhecida foi preservada. A continuação automática não está disponível.',offline:'Free · arquivos Markdown locais · sem conta',backup:'Cópias antes da primeira alteração: MyProjectTasksBackups/Free-2.2.0. A inicialização não altera os arquivos de origem.',newTaskCommand:'Criar tarefa',openCommand:'Abrir My Project Tasks Free',menu:'Ações da tarefa',projectMenu:'Ações do projeto',completedAt:'Concluída em',initialError:'Não foi possível iniciar o plugin',pendingError:'Não foi possível criar a próxima ocorrência. A operação será repetida ao abrir o quadro.',invalidFolder:'Use pastas distintas dentro do cofre, sem ..; nenhuma pode estar dentro da outra.',loading:'Carregando…',countOpen:'Ativas',countDone:'Concluídas',linkMissing:'Nota vinculada não encontrada.',repeatHint:'A próxima ocorrência é criada após a conclusão. Tarefas atrasadas mantêm a data.',retainedDate:'Data da ocorrência atual; o calendário da série é mantido.',removeItem:'Remover item',moveUp:'Mover para cima',moveDown:'Mover para baixo',unknownProject:'Projeto indisponível',readOnlyHistory:'A repetição no histórico não pode ser editada. Edite a ocorrência ativa.',dragSorted:'Selecione “Ordem manual” para reordenar as tarefas.',pendingRepair:'A próxima ocorrência aguarda recuperação.',retry:'Tentar novamente',folderExists:'Um arquivo já usa este caminho.'
};
strings.fr={
tasks:'Tâches',projects:'Projets',backlog:'À planifier',today:'Aujourd’hui',done:'Terminées',newTask:'+ Tâche',newProject:'+ Projet',empty:'Aucune tâche',noProjects:'Aucun projet créé',allProjects:'Tous les projets',noProject:'Sans projet',search:'Rechercher des tâches…',manual:'Ordre manuel',byDate:'Par date',byPriority:'Par priorité',high:'Haute',medium:'Moyenne',low:'Basse',overdue:'En retard',planned:'Pour aujourd’hui',future:'À venir',showMore:'Afficher plus',title:'Titre',project:'Projet',date:'Date prévue',priority:'Priorité',recurrence:'Répétition',none:'Sans répétition',daily:'Chaque jour',weekly:'Chaque semaine',monthly:'Chaque mois',description:'Description',checklist:'Liste de contrôle',addItem:'+ Ajouter un élément',save:'Enregistrer',cancel:'Annuler',delete:'Supprimer',edit:'Modifier',restore:'Rouvrir la tâche',openNote:'Ouvrir le fichier de la tâche',openSource:'Ouvrir la note source',complete:'Terminer',toBacklog:'Remettre à planifier',toToday:'Prévoir pour aujourd’hui',plusDay:'+1 jour',color:'Couleur',language:'Langue',auto:'Automatique',taskFolder:'Dossier des tâches',projectFolder:'Dossier des projets',foldersDesc:'Le chemin est enregistré avec « Appliquer ». Les fichiers existants ne sont pas déplacés automatiquement.',apply:'Appliquer',titleRequired:'Saisissez un titre.',dateRequired:'Indiquez une date prévue pour activer la répétition.',badDate:'Date non valide.',error:'L’opération a échoué',readError:'Impossible de lire le fichier',conflict:'Le fichier a changé depuis l’ouverture de ce formulaire. Rouvrez-le pour ne pas perdre les modifications.',deleteTask:'Supprimer la tâche ?',deleteProject:'Supprimer le projet ?',projectDeleteInfo:'Les tâches liées seront conservées sans projet. Nombre de tâches : ',deleteInfo:'Le fichier sera placé dans la corbeille. Supprimer l’occurrence active arrête la série.',restoredOnce:'La tâche a été rouverte sans répétition. La série continue séparément.',repeat:'Répétition',archived:'Issue des anciennes archives',legacyRepeat:'Une règle de répétition inconnue a été conservée. La poursuite automatique est indisponible.',offline:'Free · fichiers Markdown locaux · sans compte',backup:'Sauvegardes avant la première modification : MyProjectTasksBackups/Free-2.2.0. Le démarrage ne modifie pas les fichiers sources.',newTaskCommand:'Créer une tâche',openCommand:'Ouvrir My Project Tasks Free',menu:'Actions de la tâche',projectMenu:'Actions du projet',completedAt:'Terminée le',initialError:'Impossible de démarrer le plugin',pendingError:'Impossible de créer l’occurrence suivante. Une nouvelle tentative aura lieu à l’ouverture du tableau.',invalidFolder:'Utilisez des dossiers distincts dans le coffre, sans .. ; aucun ne doit contenir l’autre.',loading:'Chargement…',countOpen:'Actives',countDone:'Terminées',linkMissing:'Note liée introuvable.',repeatHint:'L’occurrence suivante est créée après achèvement. Les tâches en retard conservent leur date.',retainedDate:'Date de l’occurrence actuelle ; le calendrier de la série est conservé.',removeItem:'Supprimer l’élément',moveUp:'Monter',moveDown:'Descendre',unknownProject:'Projet indisponible',readOnlyHistory:'La répétition dans l’historique ne peut pas être modifiée. Modifiez l’occurrence active.',dragSorted:'Sélectionnez « Ordre manuel » pour réorganiser les tâches.',pendingRepair:'L’occurrence suivante attend sa restauration.',retry:'Réessayer',folderExists:'Un fichier utilise déjà ce chemin.'
};
const diagnostics={
ru:{invalidYaml:'Некорректные свойства YAML в файле.',fileNotFound:'Файл не найден.',backupConflict:'Конфликт пути резервной копии.',recurrenceConflict:'Путь следующего повторения занят другим файлом.'},
en:{invalidYaml:'Invalid YAML properties in the file.',fileNotFound:'File not found.',backupConflict:'Backup path conflict.',recurrenceConflict:'The next occurrence path is used by another file.'},
es:{invalidYaml:'Las propiedades YAML del archivo no son válidas.',fileNotFound:'No se encontró el archivo.',backupConflict:'Conflicto en la ruta de la copia de seguridad.',recurrenceConflict:'Otro archivo ocupa la ruta de la siguiente repetición.'},
de:{invalidYaml:'Ungültige YAML-Eigenschaften in der Datei.',fileNotFound:'Datei nicht gefunden.',backupConflict:'Konflikt beim Sicherungspfad.',recurrenceConflict:'Der Pfad der nächsten Wiederholung wird von einer anderen Datei verwendet.'},
'pt-BR':{invalidYaml:'Propriedades YAML inválidas no arquivo.',fileNotFound:'Arquivo não encontrado.',backupConflict:'Conflito no caminho da cópia de segurança.',recurrenceConflict:'Outro arquivo usa o caminho da próxima ocorrência.'},
fr:{invalidYaml:'Propriétés YAML non valides dans le fichier.',fileNotFound:'Fichier introuvable.',backupConflict:'Conflit du chemin de sauvegarde.',recurrenceConflict:'Le chemin de l’occurrence suivante est utilisé par un autre fichier.'}
};
for(const lang of Object.keys(strings))Object.assign(strings[lang],diagnostics[lang]);
module.exports=strings;

return module.exports;})();
const L=(()=>{const module={exports:{}};
'use strict';
const languages={ru:'Русский',en:'English',es:'Español',de:'Deutsch','pt-BR':'Português (Brasil)',fr:'Français'};
const locales={ru:'ru-RU',en:'en-US',es:'es-ES',de:'de-DE','pt-BR':'pt-BR',fr:'fr-FR'};
function resolve(value){const code=String(value||'').trim().replace(/_/g,'-').toLowerCase();const base=code.split('-')[0];if(base==='pt')return 'pt-BR';return Object.hasOwn(languages,base)?base:'en';}
function choose(manual,appLanguage){return Object.hasOwn(languages,manual)?manual:resolve(appLanguage);}
function text(strings,language,key){return strings[language]?.[key]||strings.en[key]||key;}
const formatters=new Map();
function formatDate(value,language){if(!value)return '';const locale=locales[language]||locales.en;let formatter=formatters.get(locale);if(!formatter){formatter=new Intl.DateTimeFormat(locale,{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'});formatters.set(locale,formatter);}const [y,m,d]=value.split('-').map(Number);const instant=new Date(0);instant.setUTCFullYear(y,m-1,d);instant.setUTCHours(12,0,0,0);return formatter.format(instant);}
module.exports={languages,locales,resolve,choose,text,formatDate};

return module.exports;})();
const VIEW='my-project-tasks-view';
const BACKUP='MyProjectTasksBackups/Free-2.2.0';
const DEFAULTS={tasksFolder:'Tasks',projectsFolder:'Projects',defaultPriority:'medium',freeLanguage:'auto'};
function split(raw) {
 const m=/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw);
 if(!m) return {fm:{},body:raw};
 const fm=parseYaml(m[1]);
 if(!fm || typeof fm!=='object' || Array.isArray(fm)) throw Object.assign(Error('Invalid YAML frontmatter'),{mptKey:'invalidYaml'});
 return {fm,body:raw.slice(m[0].length)};
}
function encode(fm,body='') { return `---\n${stringifyYaml(fm).trimEnd()}\n---\n${body}`; }
function el(host,tag,cls,text) {return host.createEl(tag,{...(cls?{cls}:{}),...(text!==undefined?{text:String(text)}:{})});}
function button(host,text,fn,cls='mpt-btn') {const b=el(host,'button',cls,text);b.type='button';b.onclick=fn;return b;}
function options(select,values,current) {for(const [v,label] of values){const o=el(select,'option','',label);o.value=v;}select.value=current||'';return select;}
function labelInput(host,label,tag='input',type='text') {const row=el(host,'label','mpt-field');el(row,'span','',label);const inp=el(row,tag);if(tag==='input')inp.type=type;return inp;}

class Confirm extends Modal {
 constructor(plugin,title,message,action){super(plugin.app);Object.assign(this,{plugin,title,message,action});}
 onOpen(){const c=this.contentEl;c.empty();el(c,'h2','',this.title);el(c,'p','',this.message);const a=el(c,'div','mpt-actions');button(a,this.plugin.t('cancel'),()=>this.close());const b=button(a,this.plugin.t('delete'),()=>this.plugin.run(async()=>{b.disabled=true;try{await this.action();this.close();}finally{b.disabled=false;}}),'mpt-btn mod-warning');}
}
class TaskModal extends Modal {
 constructor(plugin,task=null,initial={}){super(plugin.app);Object.assign(this,{plugin,task,initial});}
 async onOpen(){await this.plugin.run(async()=>{
  const p=this.plugin,t=k=>p.t(k); await p.ready;
  const c=this.contentEl;c.empty();c.addClass('mpt-task-modal');el(c,'h2','',this.task?t('edit'):t('newTask'));
  const projects=await p.loadProjects(),task=this.task||this.initial;
  const title=labelInput(c,t('title'));title.value=task.title||'';
  const project=labelInput(c,t('project'),'select');const pairs=[['',t('noProject')],...projects.map(x=>[C.key(x.path),x.title])];
  if(task.project&&!pairs.some(x=>x[0]===C.key(task.project))) pairs.push([C.key(task.project),C.key(task.project)]);
  options(project,pairs,C.key(task.project));
  const date=labelInput(c,t('date'),'input','date');date.value=task.date||'';
  const priority=labelInput(c,t('priority'),'select');options(priority,['high','medium','low'].map(x=>[x,t(x)]),task.priority||p.settings.defaultPriority);
  const rec=labelInput(c,t('recurrence'),'select');const rp=C.RECURRENCES.map(x=>[x,t(x)]);if(task.recurrence&&!C.RECURRENCES.includes(task.recurrence))rp.push([task.recurrence,task.recurrence]);options(rec,rp,task.recurrence||'none');
  rec.disabled=!!task.completed;el(c,'p','mpt-help',task.completed?t('readOnlyHistory'):t('repeatHint'));
  const desc=labelInput(c,t('description'),'textarea');desc.rows=5;desc.value=task.body||'';
  el(c,'h3','',t('checklist'));const subhost=el(c,'div','mpt-sub-editor');let subs=(task.subtasks||[]).map(x=>({...x}));
  const renderSubs=()=>{subhost.empty();subs.forEach((s,i)=>{const row=el(subhost,'div','mpt-sub-row');const cb=el(row,'input');cb.type='checkbox';cb.checked=s.done;cb.setAttribute('aria-label',s.text||t('checklist'));cb.onchange=()=>s.done=cb.checked;
    const inp=el(row,'input');inp.type='text';inp.value=s.text;inp.setAttribute('aria-label',t('checklist'));inp.oninput=()=>s.text=inp.value;
    const up=button(row,'↑',()=>{[subs[i-1],subs[i]]=[subs[i],subs[i-1]];renderSubs();});up.disabled=i===0;up.title=t('moveUp');
    const down=button(row,'↓',()=>{[subs[i+1],subs[i]]=[subs[i],subs[i+1]];renderSubs();});down.disabled=i===subs.length-1;down.title=t('moveDown');
    const del=button(row,'×',()=>{subs.splice(i,1);renderSubs();});del.title=t('removeItem');});};renderSubs();button(c,t('addItem'),()=>{subs.push({text:'',done:false});renderSubs();});
  const a=el(c,'div','mpt-actions');button(a,t('cancel'),()=>this.close());
  const save=button(a,t('save'),()=>p.run(async()=>{
   if(!title.value.trim())return new Notice(t('titleRequired'));
   if(date.value&&!C.date(date.value))return new Notice(t('badDate'));
   if(rec.value!=='none'&&!date.value&&(!this.task||rec.value!==this.task.recurrence))return new Notice(t('dateRequired'));
   save.disabled=true;
   try {await p.saveTask(this.task,{title:title.value.trim(),project:project.value?`[[${project.value}]]`:'',date:date.value,priority:priority.value,recurrence:rec.value,subtasks:subs.filter(x=>x.text.trim()).map(x=>({...x,text:x.text.trim()}))},desc.value);this.close();p.refreshViews();}finally{save.disabled=false;}
  }),'mpt-btn mod-cta');title.focus();
 });}
}
class ProjectModal extends Modal {
 constructor(plugin,project=null){super(plugin.app);Object.assign(this,{plugin,project});}
 onOpen(){const p=this.plugin,t=k=>p.t(k),c=this.contentEl;c.empty();el(c,'h2','',this.project?t('edit'):t('newProject'));
  const name=labelInput(c,t('title'));name.value=this.project?.title||'';
  const color=labelInput(c,t('color'),'input','color');color.value=/^#[0-9a-f]{6}$/i.test(this.project?.color)?this.project.color:'#4f46e5';
  const desc=labelInput(c,t('description'),'textarea');desc.rows=5;desc.value=this.project?.body||'';
  const a=el(c,'div','mpt-actions');button(a,t('cancel'),()=>this.close());const save=button(a,t('save'),()=>p.run(async()=>{if(!name.value.trim())return new Notice(t('titleRequired'));save.disabled=true;try{await p.saveProject(this.project,{name:name.value.trim(),color:color.value},desc.value);this.close();p.refreshViews();}finally{save.disabled=false;}}),'mpt-btn mod-cta');name.focus();
 }
}
class Board extends ItemView {
 constructor(leaf,plugin){super(leaf);this.plugin=plugin;this.mode='tasks';this.filter={search:'',project:'',sort:'manual'};this.doneLimit=50;this.collapsed={};this.seq=0;}
 getViewType(){return VIEW;}getDisplayText(){return 'My Project Tasks Free';}getIcon(){return 'check-square';}
 async onOpen(){await this.render();}
 async onClose(){clearTimeout(this.searchTimer);this.seq++;}
 async render(){const seq=++this.seq;try{
  await this.plugin.ready;if(!this.plugin.initialized)throw Error(this.plugin.t('initialError'));
  await this.plugin.recover();const [tasks,projects]=await Promise.all([this.plugin.loadTasks(),this.plugin.loadProjects()]);if(seq!==this.seq)return;
  this.tasks=tasks;this.projects=projects;const root=this.containerEl.children[1];
  const active=root.ownerDocument.activeElement,focus=active?.classList.contains('mpt-search'),pos=focus?active.selectionStart:null;
  const scrolls=Array.from(root.querySelectorAll('.mpt-column-body')).map(x=>x.scrollTop);root.empty();root.addClass('mpt-root');const t=k=>this.plugin.t(k);
  const top=el(root,'div','mpt-topbar');for(const mode of ['tasks','projects'])button(top,t(mode),()=>{this.mode=mode;this.render();},`mpt-btn ${this.mode===mode?'mod-cta':''}`);
  el(top,'span','mpt-version',`Free ${C.VERSION}`);button(top,t('newTask'),()=>new TaskModal(this.plugin).open(),'mpt-btn mod-cta');
  this.content=el(root,'div','mpt-content');if(this.mode==='projects')this.renderProjects();else{this.renderFilters();this.board=el(this.content,'div','mpt-board');this.renderBoard();}
  root.querySelectorAll('.mpt-column-body').forEach((x,i)=>x.scrollTop=scrolls[i]||0);
  if(focus){const s=root.querySelector('.mpt-search');s?.focus();try{s?.setSelectionRange(pos,pos);}catch{}}
 }catch(e){this.plugin.error(e);const root=this.containerEl.children[1];root.empty();el(root,'p','mpt-error',this.plugin.t('error'));button(root,this.plugin.t('retry'),()=>this.render());}}
 renderFilters(){const t=k=>this.plugin.t(k),bar=el(this.content,'div','mpt-toolbar');
  const search=el(bar,'input','mpt-search');search.type='search';search.placeholder=t('search');search.setAttribute('aria-label',t('search'));search.value=this.filter.search;search.oninput=()=>{this.filter.search=search.value;this.doneLimit=50;clearTimeout(this.searchTimer);this.searchTimer=setTimeout(()=>this.renderBoard(),100);};
  const pr=el(bar,'select');pr.setAttribute('aria-label',t('project'));options(pr,[['',t('allProjects')],['__none',t('noProject')],...this.projects.map(p=>[C.key(p.path),p.title])],this.filter.project);pr.onchange=()=>{this.filter.project=pr.value;this.doneLimit=50;this.renderBoard();};
  const sort=el(bar,'select');sort.setAttribute('aria-label',t('manual'));options(sort,[['manual',t('manual')],['date',t('byDate')],['priority',t('byPriority')]],this.filter.sort);sort.onchange=()=>{this.filter.sort=sort.value;this.renderBoard();};
 }
 filtered(){const q=this.filter.search.trim().toLocaleLowerCase();return this.tasks.filter(x=>(!q||`${x.title} ${x.body} ${x.subtasks.map(s=>s.text).join(' ')}`.toLocaleLowerCase().includes(q))&&(!this.filter.project||(this.filter.project==='__none'?!x.project:C.key(x.project)===this.filter.project)));}
 ordered(items,list){return [...items].sort((a,b)=>{
  if(list==='done')return String(b.completedAt||b.archivedAt||'').localeCompare(String(a.completedAt||a.archivedAt||''))||(b.sortOrder-a.sortOrder);
  if(this.filter.sort==='date')return (a.date||'9999').localeCompare(b.date||'9999')||a.sortOrder-b.sortOrder;
  if(this.filter.sort==='priority'){const rank={high:0,medium:1,low:2};return rank[a.priority]-rank[b.priority]||a.sortOrder-b.sortOrder;}
  return a.sortOrder-b.sortOrder||a.title.localeCompare(b.title);
 });}
 renderBoard(){if(!this.board)return;this.board.empty();const t=k=>this.plugin.t(k),today=this.plugin.today(),tasks=this.filtered();
  for(const list of ['backlog','today','done']){
   const items=this.ordered(tasks.filter(x=>C.bucket(x,today)===list),list),col=el(this.board,'section',`mpt-column mpt-${list}`);
   const head=el(col,'div','mpt-column-head');el(head,'h3','',t(list));el(head,'span','mpt-count',items.length);
   if(list!=='done')button(head,'+',()=>new TaskModal(this.plugin,null,{date:list==='today'?today:''}).open()).setAttribute('aria-label',t('newTask'));
   const body=el(col,'div','mpt-column-body');body.dataset.list=list;this.drop(body,list);
   if(!items.length)el(body,'p','mpt-empty',t('empty'));
   if(list==='today'){
    for(const [group,label] of [['overdue',t('overdue')],['planned',t('planned')]]){
     const members=items.filter(x=>group==='overdue'?x.date<today:x.date===today);if(!members.length)continue;
     const groupBtn=button(body,`${this.collapsed[group]?'▸':'▾'} ${label} (${members.length})`,()=>{this.collapsed[group]=!this.collapsed[group];this.renderBoard();},'mpt-group');groupBtn.setAttribute('aria-expanded',String(!this.collapsed[group]));
     if(!this.collapsed[group])for(const task of members)this.card(body,task,list);
    }
   }else {for(const task of items.slice(0,list==='done'?this.doneLimit:undefined))this.card(body,task,list);if(list==='done'&&items.length>this.doneLimit)button(body,t('showMore'),()=>{this.doneLimit+=50;this.renderBoard();});}
  }
 }
 drop(node,list,target=null){node.ondragover=e=>{if(e.dataTransfer?.types?.includes('text/mpt-task')){e.preventDefault();e.stopPropagation();node.classList.add('mpt-dragover');}};node.ondragleave=()=>node.classList.remove('mpt-dragover');
  node.ondrop=e=>{e.preventDefault();e.stopPropagation();node.classList.remove('mpt-dragover');const path=e.dataTransfer.getData('text/mpt-task');if(!path||path===target?.path)return;
   this.plugin.run(async()=>{if(this.filter.sort!=='manual'&&target&&C.bucket(target,this.plugin.today())===C.bucket(this.tasks.find(x=>x.path===path)||{},this.plugin.today()))return new Notice(this.plugin.t('dragSorted'));
    await this.plugin.move(path,list,target?.path,e.clientY>node.getBoundingClientRect().top+node.getBoundingClientRect().height/2);await this.render();});};}
 card(host,task,list){const p=this.plugin,t=k=>p.t(k),card=el(host,'article',`mpt-card${task.completed?' is-completed':''}${!task.completed&&task.date&&task.date<p.today()?' is-overdue':''}`);
  const project=this.projects.find(x=>C.key(x.path)===C.key(task.project));card.style.borderLeftColor=project?.color||'#64748b';card.draggable=true;card.ondragstart=e=>{if(e.target.closest('button,input,select,a')){e.preventDefault();return;}e.dataTransfer.setData('text/mpt-task',task.path);e.dataTransfer.effectAllowed='move';};this.drop(card,list,task);
  button(card,task.title,()=>new TaskModal(p,task).open(),'mpt-card-title');
  const meta=el(card,'div','mpt-meta');if(project)el(meta,'span','',project.title);else if(task.project)el(meta,'span','',C.key(task.project));
  el(meta,'span',`mpt-priority mpt-priority-${task.priority}`,t(task.priority));if(task.date)el(meta,'span','',p.formatDate(task.date));
  if(task.completedAt&&task.completed)el(meta,'span','',`${t('completedAt')}: ${p.formatDate(task.completedAt)}`);
  if(task.recurrence!=='none')el(meta,'span','',`↻ ${C.RECURRENCES.includes(task.recurrence)?t(task.recurrence):task.recurrence}`);
  if(task.archived)el(meta,'span','',t('archived'));if(task.mptNextPending)el(card,'p','mpt-error',t('pendingRepair'));
  if(task.subtasks.length){el(card,'div','mpt-meta',`${task.subtasks.filter(x=>x.done).length} / ${task.subtasks.length}`);for(const [i,s] of task.subtasks.slice(0,3).entries()){const row=el(card,'label','mpt-check');const cb=el(row,'input');cb.type='checkbox';cb.checked=s.done;cb.onchange=()=>p.run(()=>p.toggleSubtask(task.path,i,cb.checked));el(row,'span','',s.text);}}
  const a=el(card,'div','mpt-card-actions');if(!task.completed)button(a,'✓',()=>p.run(()=>p.move(task.path,'done'))).setAttribute('aria-label',t('complete'));
  if(task.completed)button(a,t('restore'),()=>p.run(()=>p.restore(task.path)));
  else if(list!=='today')button(a,t('toToday'),()=>p.run(()=>p.move(task.path,'today')));
  button(a,'⋯',e=>this.taskMenu(e,task)).setAttribute('aria-label',t('menu'));
  card.oncontextmenu=e=>{e.preventDefault();this.taskMenu(e,task);};
 }
 taskMenu(event,task){const p=this.plugin,t=k=>p.t(k),m=new Menu();const add=(name,fn)=>m.addItem(x=>x.setTitle(t(name)).onClick(()=>p.run(fn)));
  add('edit',()=>new TaskModal(p,task).open());if(task.completed)add('restore',()=>p.restore(task.path));else{add('complete',()=>p.move(task.path,'done'));add('toToday',()=>p.move(task.path,'today'));add('toBacklog',()=>p.move(task.path,'backlog'));add('plusDay',()=>p.shiftDay(task.path));}
  add('openNote',()=>p.app.workspace.openLinkText(task.path,'',false));if(task.source)add('openSource',()=>p.openSource(task));add('delete',()=>p.confirmDeleteTask(task));m.showAtMouseEvent(event);
 }
 renderProjects(){const p=this.plugin,t=k=>p.t(k);button(this.content,t('newProject'),()=>new ProjectModal(p).open(),'mpt-btn mod-cta');const grid=el(this.content,'div','mpt-project-grid');if(!this.projects.length)el(grid,'p','',t('noProjects'));
  for(const project of this.projects){const card=el(grid,'article','mpt-project-card');card.style.borderTopColor=project.color||'#4f46e5';button(card,project.title,()=>{this.mode='tasks';this.filter.project=C.key(project.path);this.render();},'mpt-card-title');
   const tasks=this.tasks.filter(x=>C.key(x.project)===C.key(project.path));el(card,'p','mpt-meta',`${t('countOpen')}: ${tasks.filter(x=>!x.completed).length} · ${t('countDone')}: ${tasks.filter(x=>x.completed).length}`);
   const a=el(card,'div','mpt-actions');button(a,t('edit'),()=>new ProjectModal(p,project).open());button(a,t('delete'),()=>p.confirmDeleteProject(project));}
 }
}
class Settings extends PluginSettingTab {
 constructor(app,plugin){super(app,plugin);this.plugin=plugin;}
 display(){const p=this.plugin,t=k=>p.t(k),c=this.containerEl;c.empty();el(c,'h2','',`My Project Tasks Free ${C.VERSION}`);
  new Setting(c).setName(t('language')).addDropdown(d=>{d.addOption('auto',t('auto'));for(const [code,name] of Object.entries(L.languages))d.addOption(code,name);d.setValue(p.settings.freeLanguage).onChange(v=>p.run(async()=>{p.settings.freeLanguage=v;await p.saveData(p.settings);p.updateCommandLabels();this.display();p.refreshViews();}));});
  let tasks=p.settings.tasksFolder,projects=p.settings.projectsFolder;
  new Setting(c).setName(t('taskFolder')).addText(x=>x.setValue(tasks).onChange(v=>tasks=v));new Setting(c).setName(t('projectFolder')).addText(x=>x.setValue(projects).onChange(v=>projects=v));
  new Setting(c).setDesc(t('foldersDesc')).addButton(x=>x.setButtonText(t('apply')).onClick(()=>p.run(async()=>{const a=p.validFolder(tasks),b=p.validFolder(projects);if(!a||!b||a===b||a.startsWith(b+'/')||b.startsWith(a+'/'))throw Error(t('invalidFolder'));await p.folder(a);await p.folder(b);p.settings.tasksFolder=a;p.settings.projectsFolder=b;await p.saveData(p.settings);p.cache.clear();p.refreshViews();})));
  el(c,'p','mpt-help',t('offline'));el(c,'p','mpt-help',t('backup'));
 }
}
class MyProjectTasksFree extends Plugin {
 onload(){this.settings={...DEFAULTS};this.cache=new Map();this.queue=Promise.resolve();this.initialized=false;this._day=C.iso();this.reported=new Set();
  this.registerView(VIEW,leaf=>new Board(leaf,this));this.addRibbonIcon('check-square','My Project Tasks Free',()=>this.run(()=>this.open()));
  this.openCommand=this.addCommand({id:'open-my-project-tasks',name:this.t('openCommand'),callback:()=>this.run(()=>this.open())});
  this.newTaskCommand=this.addCommand({id:'new-project-task',name:this.t('newTaskCommand'),callback:()=>this.run(async()=>{await this.ready;new TaskModal(this).open();})});this.addSettingTab(new Settings(this.app,this));
  for(const event of ['create','modify','delete','rename'])this.registerEvent(this.app.vault.on(event,(file,oldPath)=>{this.cache.delete(file.path);if(oldPath)this.cache.delete(oldPath);this.scheduleRefresh();}));
  this.registerInterval(window.setInterval(()=>this.checkDay(),30000));this.registerDomEvent(document,'visibilitychange',()=>{if(!document.hidden)this.checkDay();});this.registerDomEvent(window,'focus',()=>this.checkDay());
  this.ready=this.initialize();this.app.workspace.onLayoutReady(()=>this.run(async()=>{await this.ready;await this.recover();this.refreshViews();}));
 }
 async initialize(){try{const stored=await this.loadData()||{};this.settings={...DEFAULTS,...stored};if(!['auto',...Object.keys(L.languages)].includes(this.settings.freeLanguage))this.settings.freeLanguage='auto';
  for(const field of ['tasksFolder','projectsFolder'])if(!this.validFolder(this.settings[field]))throw Error(this.t('invalidFolder'));
  const a=this.settings.tasksFolder,b=this.settings.projectsFolder;if(a===b||a.startsWith(b+'/')||b.startsWith(a+'/'))throw Error(this.t('invalidFolder'));await this.folder(a);await this.folder(b);this.initialized=true;this.updateCommandLabels();
 }catch(e){this.error(e);}}
 onunload(){clearTimeout(this.refreshTimer);for(const leaf of this.app.workspace.getLeavesOfType(VIEW))clearTimeout(leaf.view?.searchTimer);}
 appLanguage(){
  try{if(typeof getLanguage==='function'){const language=getLanguage();if(language)return language;}}catch{}
  try{const language=window.localStorage.getItem('language');if(language)return language;}catch{}
  try{return navigator.language||'en';}catch{return 'en';}
 }
 lang(){return L.choose(this.settings.freeLanguage,this.appLanguage());}
 t(k){return L.text(STRINGS,this.lang(),k);}
 updateCommandLabels(){if(this.openCommand)this.openCommand.name=this.t('openCommand');if(this.newTaskCommand)this.newTaskCommand.name=this.t('newTaskCommand');}
 today(){return C.iso();}formatDate(s){const d=C.date(s);return d?L.formatDate(d,this.lang()):'';}
 error(e){console.error('My Project Tasks Free:',e);new Notice(`${this.t('error')}: ${e?.mptKey?this.t(e.mptKey):e?.message||e}`,8000);}
 async run(fn){try{return await fn();}catch(e){this.error(e);}}
 serial(fn){const work=this.queue.then(fn);this.queue=work.catch(()=>{});return work;}
 checkDay(){const now=this.today();if(now!==this._day){this._day=now;this.refreshViews();}}
 scheduleRefresh(){clearTimeout(this.refreshTimer);this.refreshTimer=setTimeout(()=>this.refreshViews(),180);}
 refreshViews(){for(const leaf of this.app.workspace.getLeavesOfType(VIEW))leaf.view?.render?.();}
 async open(){await this.ready;let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];if(!leaf){leaf=this.app.workspace.getLeaf(false);await leaf.setViewState({type:VIEW,active:true});}await this.app.workspace.revealLeaf(leaf);return leaf.view;}
 validFolder(path){const s=String(path||'').trim().replace(/\\/g,'/').replace(/\/+$/,'');if(!s||s.startsWith('/')||s.split('/').some(x=>!x||x==='..'||x==='.'||x.startsWith('.'))||/[:*?"<>|]/.test(s)||s.startsWith('MyProjectTasksBackups'))return '';return normalizePath(s);}
 async folder(path){let current='';for(const part of path.split('/')){current=current?`${current}/${part}`:part;const existing=this.app.vault.getAbstractFileByPath(current);if(existing instanceof TFile)throw Error(this.t('folderExists'));if(!existing)try{await this.app.vault.createFolder(current);}catch(e){if(!this.app.vault.getAbstractFileByPath(current))throw e;}}}
 async read(file,fresh=false){if(!file||!(file instanceof TFile))throw Error(this.t('fileNotFound'));if(!fresh&&this.cache.has(file.path))return this.cache.get(file.path);
  const raw=await this.app.vault.read(file),{fm,body}=split(raw),record={...C.normalize(fm,file.path,body),fm,raw};this.cache.set(file.path,record);return record;}
 async entity(path){const f=this.app.vault.getAbstractFileByPath(path);return this.read(f,true);}
 async load(type){const files=this.app.vault.getMarkdownFiles().filter(f=>!f.path.startsWith('MyProjectTasksBackup'));
  const out=[];let index=0;const worker=async()=>{while(index<files.length){const file=files[index++];const prefix=(type==='task'?this.settings.tasksFolder:this.settings.projectsFolder)+'/';const fm=this.app.metadataCache.getFileCache(file)?.frontmatter;
   if(!file.path.startsWith(prefix)&&fm?.type!==type)continue;
   try{const e=await this.read(file);if(e.fm.type===type)out.push(e);}catch(e){if(!this.reported.has(file.path)){this.reported.add(file.path);new Notice(`${this.t('readError')}: ${file.path}${e.mptKey?' — '+this.t(e.mptKey):''}`,8000);}console.error(e);}}};await Promise.all(Array.from({length:8},worker));return out;}
 loadTasks(){return this.load('task');}loadProjects(){return this.load('project').then(xs=>xs.sort((a,b)=>a.title.localeCompare(b.title)));}
 async backup(record){let hash=14695981039346656037n;for(const char of record.path){hash^=BigInt(char.codePointAt(0));hash=BigInt.asUintN(64,hash*1099511628211n);}const base=`${BACKUP}/${hash.toString(16)}.json`;const existing=this.app.vault.getAbstractFileByPath(base);if(existing){const saved=JSON.parse(await this.app.vault.read(existing));if(saved.originalPath!==record.path)throw Error(this.t('backupConflict'));return;}await this.folder(BACKUP);await this.app.vault.create(base,JSON.stringify({originalPath:record.path,createdAt:new Date().toISOString(),content:record.raw},null,2));}
 async write(record,changes,body){await this.backup(record);const file=this.app.vault.getAbstractFileByPath(record.path);if(!(file instanceof TFile))throw Error(this.t('fileNotFound'));
  await this.app.vault.process(file,raw=>{if(raw!==record.raw)throw Error(this.t('conflict'));const current=split(raw);return encode({...current.fm,...changes},body===undefined?current.body:body);});this.cache.delete(record.path);return this.entity(record.path);}
 async create(type,values,body=''){const folder=type==='task'?this.settings.tasksFolder:this.settings.projectsFolder;await this.folder(folder);let path=`${folder}/${C.safeName(values.title||values.name)}.md`,n=2;while(this.app.vault.getAbstractFileByPath(path))path=`${folder}/${C.safeName(values.title||values.name)} (${n++}).md`;
  const fm={type,id:C.id(),createdAt:this.today(),...values};await this.app.vault.create(path,encode(fm,body));return this.entity(path);}
 async saveTask(original,values,body){return this.serial(async()=>{let old=original?await this.entity(original.path):null;if(old&&old.raw!==original.raw)throw Error(this.t('conflict'));
  const changes={...values,updatedAt:this.today()};if(!old){Object.assign(changes,{completed:false,archived:false,sortOrder:Date.now(),listId:C.bucket(changes,this.today())});}
  if(values.recurrence!=='none'&&(!old||old.recurrence!==values.recurrence||(!old.mptAnchor&&!old.date))){changes.mptAnchor=values.date;changes.mptScheduled=values.date;changes.mptSeriesId=C.id();changes.mptNextId='';}
  else if(old?.recurrence!=='none'&&values.recurrence!=='none'){changes.mptAnchor=old.mptAnchor||old.date||values.date;changes.mptScheduled=old.mptScheduled||old.date||values.date;}
  if(old){changes.id=old.id||C.id();if(!old.completed)changes.listId=C.bucket({...old,...changes},this.today());await this.write(old,changes,body);}else await this.create('task',changes,body);
  this.refreshViews();});}
 async saveProject(original,values,body){return this.serial(async()=>{if(original){const old=await this.entity(original.path);if(old.raw!==original.raw)throw Error(this.t('conflict'));await this.write(old,{...values,id:old.id||C.id()},body);}else await this.create('project',values,body);this.refreshViews();});}
 async toggleSubtask(path,index,done){return this.serial(async()=>{const old=await this.entity(path);const subtasks=old.subtasks.map(x=>({...x}));if(!subtasks[index])return;subtasks[index].done=done;await this.write(old,{subtasks,updatedAt:this.today()});this.refreshViews();});}
 async complete(old){if(old.completed)return;if(old.recurrence!=='none'&&!C.RECURRENCES.includes(old.recurrence))throw Error(this.t('legacyRepeat'));
  const changes={id:old.id||C.id(),completed:true,completedAt:this.today(),listId:'done',sortOrder:Date.now(),updatedAt:this.today()};
  if(old.recurrence!=='none'){
   const nextId=C.id(),next=C.nextOccurrence(old,this.today()),series=old.mptSeriesId||changes.id;
   changes.mptAnchor=old.mptAnchor||old.mptScheduled||old.date||this.today();changes.mptScheduled=old.mptScheduled||old.date||changes.mptAnchor;changes.mptSeriesId=series;changes.mptNextId=nextId;
   changes.mptNextPending={id:nextId,date:next,path:`${this.settings.tasksFolder}/${C.safeName(old.title)} -- ${nextId}.md`};
  }
  const completed=await this.write(old,changes);if(changes.mptNextPending)await this.ensureNext(completed);
 }
 async ensureNext(parent){const pending=parent.fm.mptNextPending;if(!pending)return;
  const existing=this.app.vault.getAbstractFileByPath(pending.path);if(existing){const record=await this.read(existing,true);if(record.id!==pending.id)throw Error(this.t('recurrenceConflict'));}
  else {await this.folder(pending.path.split('/').slice(0,-1).join('/'));
   const fm={...parent.fm,id:pending.id,completed:false,completedAt:'',date:pending.date,listId:'backlog',archived:false,archivedAt:'',mptScheduled:pending.date,mptNextId:'',mptNextPending:null,mptPreviousId:parent.id,subtasks:parent.subtasks.map(x=>({...x,done:false})),createdAt:this.today(),updatedAt:this.today(),sortOrder:Date.now()};
   await this.app.vault.create(pending.path,encode(fm,parent.body));
  }
  const current=await this.entity(parent.path);await this.write(current,{mptNextPending:null});
 }
 async recover(){if(!this.initialized)return;if(this.recovering)return this.recovering;
  this.recovering=this.serial(async()=>{const tasks=await this.loadTasks();for(const t of tasks.filter(x=>x.completed&&x.mptNextPending)){try{await this.ensureNext(await this.entity(t.path));}catch(e){if(!this.reported.has('pending:'+t.path)){this.reported.add('pending:'+t.path);new Notice(this.t('pendingError'),8000);}console.error(e);}}});
  try{await this.recovering;}finally{this.recovering=null;}
 }
 async move(path,target,targetPath=null,after=false){return this.serial(async()=>{let old=await this.entity(path);const current=C.bucket(old,this.today());
  if(target==='done'&&!old.completed){await this.complete(old);this.refreshViews();return;}
  const changes=C.movement(old,target,this.today());if(old.completed&&old.mptNextPending)await this.ensureNext(old);
  old=await this.entity(path);
  if(old.completed&&target!=='done'&&old.mptNextId)new Notice(this.t('restoredOnce'));
  const tasks=await this.loadTasks(),items=tasks.filter(x=>x.path!==path&&C.bucket(x,this.today())===target).sort((a,b)=>a.sortOrder-b.sortOrder);
  let order=(items.at(-1)?.sortOrder||0)+1000;
  if(targetPath){const i=items.findIndex(x=>x.path===targetPath);if(i>=0){const at=i+(after?1:0),left=items[at-1]?.sortOrder,right=items[at]?.sortOrder;order=left===undefined?(right||0)-1000:right===undefined?left+1000:(left+right)/2;
   if(left!==undefined&&right!==undefined&&(order===left||order===right||left===right)){for(let n=0;n<items.length;n++){const r=await this.entity(items[n].path);await this.write(r,{sortOrder:(n+1)*1000});}order=at*1000+500;}}}
  const preserveSchedule=old.recurrence!=='none'?{mptAnchor:old.mptAnchor||old.date||this.today(),mptScheduled:old.mptScheduled||old.date||this.today()}:{};
  await this.write(old,{...preserveSchedule,...changes,...(current!==target?{listId:target}:{}),sortOrder:order,updatedAt:this.today()});this.refreshViews();});}
 async restore(path){return this.serial(async()=>{let old=await this.entity(path);if(old.mptNextPending){await this.ensureNext(old);old=await this.entity(path);}if(!old.completed&&!old.archived)return;
  const changes=C.movement(old,'',this.today(),true);await this.write(old,{...changes,listId:C.bucket({...old,...changes},this.today()),updatedAt:this.today()});if(old.mptNextId)new Notice(this.t('restoredOnce'));this.refreshViews();});}
 async shiftDay(path){return this.serial(async()=>{const old=await this.entity(path);const base=C.asDate(old.date&&old.date>this.today()?old.date:this.today());base.setDate(base.getDate()+1);const date=C.iso(base);
  await this.write(old,{date,listId:'backlog',...(old.recurrence!=='none'?{mptAnchor:old.mptAnchor||old.date||this.today(),mptScheduled:old.mptScheduled||old.date||this.today()}:{}),updatedAt:this.today()});this.refreshViews();});}
 async openSource(task){const path=C.key(task.source),file=this.app.metadataCache.getFirstLinkpathDest(path,task.path);if(!file)return new Notice(this.t('linkMissing'));await this.app.workspace.openLinkText(file.path,task.path,false);}
 confirmDeleteTask(task){new Confirm(this,this.t('deleteTask'),`${task.title}\n${this.t('deleteInfo')}`,()=>this.serial(async()=>{let old=await this.entity(task.path);if(old.mptNextPending){await this.ensureNext(old);old=await this.entity(task.path);}await this.backup(old);await this.app.fileManager.trashFile(this.app.vault.getAbstractFileByPath(task.path));this.cache.delete(task.path);this.refreshViews();})).open();}
 async confirmDeleteProject(project){await this.run(async()=>{const tasks=(await this.loadTasks()).filter(x=>C.key(x.project)===C.key(project.path));new Confirm(this,this.t('deleteProject'),`${project.title}\n${this.t('projectDeleteInfo')}${tasks.length}`,()=>this.serial(async()=>{const current=await this.entity(project.path);await this.backup(current);const related=(await this.loadTasks()).filter(x=>C.key(x.project)===C.key(project.path));for(const task of related)await this.write(await this.entity(task.path),{project:'',updatedAt:this.today()});await this.app.fileManager.trashFile(this.app.vault.getAbstractFileByPath(project.path));this.cache.delete(project.path);this.refreshViews();})).open();});}
}
module.exports=MyProjectTasksFree;
