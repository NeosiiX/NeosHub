import React, { useState, useEffect, useMemo } from 'react';
import { 
  Github, FolderGit2, Users, Settings, MessageSquare, Star, 
  Pin, Shield, Plus, Search, UserCircle, LogOut, Edit3, 
  Trash2, X, Check, Building, Key, Send, Database
} from 'lucide-react';
import { 
  initializeApp 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { 
  getFirestore, collection, doc, setDoc, getDoc, onSnapshot, 
  addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// --- Configuration Firebase ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'glassforge-app';

// --- Composants UI Liquid Glass ---
const GlassCard = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-2xl text-slate-100 ${onClick ? 'cursor-pointer hover:bg-white/10 transition-all' : ''} ${className}`}
  >
    {children}
  </div>
);

const GlassInput = ({ className = "", ...props }) => (
  <input 
    className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all ${className}`}
    {...props}
  />
);

const GlassTextarea = ({ className = "", ...props }) => (
  <textarea 
    className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition-all ${className}`}
    {...props}
  />
);

const GlassButton = ({ children, variant = "primary", className = "", ...props }) => {
  const variants = {
    primary: "bg-indigo-600/60 hover:bg-indigo-500/80 border-indigo-400/30",
    secondary: "bg-white/10 hover:bg-white/20 border-white/10",
    danger: "bg-red-600/50 hover:bg-red-500/70 border-red-400/30",
    success: "bg-emerald-600/50 hover:bg-emerald-500/70 border-emerald-400/30"
  };
  return (
    <button 
      className={`px-4 py-2 rounded-xl border backdrop-blur-md transition-all font-medium flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  
  // Données globales
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  
  // Navigation et Etat de l'UI
  const [currentView, setCurrentView] = useState('home'); // home, profile, project, org, create_project, create_org
  const [activeItemId, setActiveItemId] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Initialisation et Auth ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        ensureUserProfile(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const ensureUserProfile = async (uid) => {
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const newProfile = {
        uid,
        displayName: `Utilisateur_${uid.substring(0,5)}`,
        bio: 'Nouveau développeur sur GlassForge',
        role: 'user',
        pinned: [],
        favorites: [],
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, newProfile);
      setUserData(newProfile);
    }
  };

  // --- Abonnements aux données (Firestore) ---
  useEffect(() => {
    if (!user) return;

    const baseCol = collection(db, 'artifacts', appId, 'public', 'data');
    
    const unsubs = [
      onSnapshot(collection(baseCol, 'users'), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(data);
        const myData = data.find(u => u.uid === user.uid);
        if (myData) setUserData(myData);
      }, console.error),
      
      onSnapshot(collection(baseCol, 'projects'), (snap) => {
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, console.error),
      
      onSnapshot(collection(baseCol, 'organizations'), (snap) => {
        setOrganizations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, console.error),
      
      onSnapshot(collection(baseCol, 'discussions'), (snap) => {
        setDiscussions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt));
      }, console.error)
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [user]);

  // --- Actions ---
  const navigateTo = (view, id = null) => {
    setCurrentView(view);
    setActiveItemId(id);
    window.scrollTo(0,0);
  };

  const toggleFavorite = async (projectId) => {
    if (!userData) return;
    const isFav = userData.favorites?.includes(projectId);
    const newFavs = isFav ? userData.favorites.filter(id => id !== projectId) : [...(userData.favorites || []), projectId];
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), { favorites: newFavs });
  };

  const togglePin = async (projectId) => {
    if (!userData) return;
    const isPinned = userData.pinned?.includes(projectId);
    const newPinned = isPinned ? userData.pinned.filter(id => id !== projectId) : [...(userData.pinned || []), projectId];
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), { pinned: newPinned });
  };

  const deleteProject = async (projectId) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId));
    // Optionnel : supprimer les discussions associées
    navigateTo('home');
  };

  if (!user || loading || !userData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background animé Liquid Glass */}
      <style dangerouslySetInnerHTML={{__html: `
        .glass-bg {
          background: linear-gradient(-45deg, #0f172a, #312e81, #1e1b4b, #0f172a);
          background-size: 400% 400%;
          animation: gradient 15s ease infinite;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: -1;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}} />
      <div className="glass-bg"></div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/5 backdrop-blur-lg border-b border-white/10 px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigateTo('home')}>
            <div className="p-2 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/40 transition-colors">
              <FolderGit2 className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">GlassForge</span>
          </div>
          <div className="hidden md:flex relative group">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Rechercher des projets..." 
              className="bg-black/20 border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <GlassButton variant="primary" className="!py-1.5 !px-3 text-sm" onClick={() => navigateTo('create_project')}>
            <Plus className="w-4 h-4" /> Nouveau
          </GlassButton>
          <div 
            className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-white/10"
            onClick={() => navigateTo('profile', user.uid)}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
              {userData.displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-white/90 hidden sm:block">{userData.displayName}</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto min-h-screen flex flex-col">
        
        {/* --- VUES --- */}
        {currentView === 'home' && (
          <HomeView 
            projects={projects} 
            users={users} 
            organizations={organizations} 
            navigateTo={navigateTo} 
          />
        )}

        {currentView === 'profile' && (
          <ProfileView 
            userId={activeItemId} 
            currentUser={user}
            userData={userData}
            users={users} 
            projects={projects} 
            organizations={organizations}
            navigateTo={navigateTo} 
            togglePin={togglePin}
            toggleFavorite={toggleFavorite}
            db={db}
            appId={appId}
          />
        )}

        {currentView === 'project' && (
          <ProjectView 
            projectId={activeItemId}
            projects={projects}
            users={users}
            organizations={organizations}
            discussions={discussions}
            currentUser={userData}
            navigateTo={navigateTo}
            deleteProject={deleteProject}
            toggleFavorite={toggleFavorite}
            db={db}
            appId={appId}
          />
        )}

        {currentView === 'create_project' && (
          <CreateProjectView 
            currentUser={user} 
            organizations={organizations.filter(o => o.members?.some(m => m.uid === user.uid))}
            navigateTo={navigateTo}
            db={db}
            appId={appId}
          />
        )}

        {currentView === 'create_org' && (
          <CreateOrgView 
            currentUser={user} 
            navigateTo={navigateTo}
            db={db}
            appId={appId}
          />
        )}
        
        {currentView === 'org' && (
          <OrgView 
            orgId={activeItemId}
            organizations={organizations}
            projects={projects}
            users={users}
            navigateTo={navigateTo}
          />
        )}

      </main>
    </div>
  );
}

// ==========================================
// COMPOSANTS DE VUE
// ==========================================

function HomeView({ projects, users, organizations, navigateTo }) {
  const [tab, setTab] = useState('all'); // all, orgs

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <FolderGit2 className="w-8 h-8 text-indigo-400" />
          Tableau de bord
        </h1>
        <div className="flex gap-2 bg-black/20 p-1 rounded-xl border border-white/10">
          <button 
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'all' ? 'bg-white/10 text-white shadow' : 'text-white/60 hover:text-white'}`}
            onClick={() => setTab('all')}
          >
            Tous les projets
          </button>
          <button 
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'orgs' ? 'bg-white/10 text-white shadow' : 'text-white/60 hover:text-white'}`}
            onClick={() => setTab('orgs')}
          >
            Organisations
          </button>
        </div>
      </div>

      {tab === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} users={users} organizations={organizations} onClick={() => navigateTo('project', p.id)} />
          ))}
          {projects.length === 0 && (
            <div className="col-span-full text-center py-12 text-white/50">Aucun projet disponible. Soyez le premier à en créer un !</div>
          )}
        </div>
      ) : (
        <div>
           <div className="flex justify-end mb-4">
             <GlassButton variant="secondary" onClick={() => navigateTo('create_org')}>
               <Plus className="w-4 h-4" /> Créer une organisation
             </GlassButton>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map(o => (
              <GlassCard key={o.id} onClick={() => navigateTo('org', o.id)} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{o.name}</h3>
                  <p className="text-sm text-white/60 line-clamp-1">{o.description}</p>
                </div>
              </GlassCard>
            ))}
            {organizations.length === 0 && (
              <div className="col-span-full text-center py-12 text-white/50">Aucune organisation trouvée.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ userId, currentUser, userData, users, projects, organizations, navigateTo, togglePin, toggleFavorite, db, appId }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  
  const profileUser = users.find(u => u.uid === userId);
  const isMe = currentUser.uid === userId;
  
  if (!profileUser) return <div>Profil introuvable</div>;

  const myProjects = projects.filter(p => p.ownerId === userId && p.ownerType === 'user');
  const pinnedProjects = projects.filter(p => profileUser.pinned?.includes(p.id));
  const favoriteProjects = projects.filter(p => profileUser.favorites?.includes(p.id));
  
  const myOrgs = organizations.filter(o => o.members?.some(m => m.uid === userId));

  const handleSaveProfile = async () => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid), {
      displayName: editName,
      bio: editBio
    });
    setEditing(false);
  };

  const handleMakeAdmin = async () => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid), {
      role: 'admin'
    });
    alert("Vous êtes maintenant Administrateur !");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
      {/* Colonne de gauche (Infos utilisateur) */}
      <div className="lg:col-span-1 space-y-6">
        <GlassCard className="text-center p-8">
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-5xl font-bold text-white shadow-xl border-4 border-white/10 mb-6">
            {profileUser.displayName.charAt(0).toUpperCase()}
          </div>
          
          {editing ? (
            <div className="space-y-4 text-left">
              <div>
                <label className="text-xs text-white/60 ml-1">Nom d'affichage</label>
                <GlassInput value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-white/60 ml-1">Biographie</label>
                <GlassTextarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} />
              </div>
              <div className="flex gap-2">
                <GlassButton className="flex-1" onClick={handleSaveProfile}><Check className="w-4 h-4"/> Sauver</GlassButton>
                <GlassButton variant="secondary" onClick={() => setEditing(false)}><X className="w-4 h-4"/></GlassButton>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">{profileUser.displayName}</h2>
              <p className="text-white/70 mb-6">{profileUser.bio}</p>
              
              {isMe && (
                <GlassButton variant="secondary" className="w-full mb-4" onClick={() => { setEditName(profileUser.displayName); setEditBio(profileUser.bio); setEditing(true); }}>
                  <Edit3 className="w-4 h-4" /> Éditer le profil
                </GlassButton>
              )}
              {isMe && profileUser.role !== 'admin' && (
                <GlassButton variant="danger" className="w-full text-xs" onClick={handleMakeAdmin}>
                  <Shield className="w-4 h-4" /> Devenir Admin (Démo)
                </GlassButton>
              )}
              {profileUser.role === 'admin' && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-300 rounded-full text-sm font-medium">
                  <Shield className="w-4 h-4" /> Administrateur
                </div>
              )}
            </>
          )}
        </GlassCard>

        {myOrgs.length > 0 && (
          <GlassCard className="p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <Building className="w-5 h-5 text-purple-400" /> Organisations
            </h3>
            <div className="space-y-3">
              {myOrgs.map(org => (
                <div key={org.id} onClick={() => navigateTo('org', org.id)} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center"><Building className="w-4 h-4 text-purple-300" /></div>
                  <span className="font-medium text-sm">{org.name}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      {/* Colonne de droite (Projets) */}
      <div className="lg:col-span-3 space-y-8">
        
        {pinnedProjects.length > 0 && (
          <section>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Pin className="w-5 h-5 text-indigo-400" /> Projets Épinglés
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pinnedProjects.map(p => (
                <ProjectCard key={p.id} project={p} users={users} organizations={organizations} onClick={() => navigateTo('project', p.id)} isPinned={true} onTogglePin={isMe ? () => togglePin(p.id) : null} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-400" /> Dépôts de {profileUser.displayName}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myProjects.map(p => (
              <ProjectCard key={p.id} project={p} users={users} organizations={organizations} onClick={() => navigateTo('project', p.id)} 
                isPinned={profileUser.pinned?.includes(p.id)} 
                onTogglePin={isMe ? (e) => { e.stopPropagation(); togglePin(p.id); } : null} 
              />
            ))}
            {myProjects.length === 0 && <div className="text-white/50 col-span-full">Aucun dépôt public.</div>}
          </div>
        </section>

        {isMe && favoriteProjects.length > 0 && (
          <section>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" /> Favoris
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteProjects.map(p => (
                <ProjectCard key={p.id} project={p} users={users} organizations={organizations} onClick={() => navigateTo('project', p.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ProjectView({ projectId, projects, users, organizations, discussions, currentUser, navigateTo, deleteProject, toggleFavorite, db, appId }) {
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' ou 'database'

  const project = projects.find(p => p.id === projectId);
  
  if (!project) return <div>Projet introuvable</div>;

  const owner = project.ownerType === 'user' 
    ? users.find(u => u.uid === project.ownerId)
    : organizations.find(o => o.id === project.ownerId);

  const ownerName = owner ? (owner.displayName || owner.name) : 'Inconnu';
  const isOwner = project.ownerType === 'user' ? project.ownerId === currentUser.uid : owner?.members?.some(m => m.uid === currentUser.uid && m.role === 'admin');
  const isAdmin = currentUser.role === 'admin';
  const isFavorite = currentUser.favorites?.includes(project.id);

  const projectDiscussions = discussions.filter(d => d.projectId === projectId);

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'discussions'), {
      projectId,
      authorId: currentUser.uid,
      content: commentText.trim(),
      createdAt: Date.now()
    });
    setCommentText('');
  };

  const handleDeleteComment = async (commentId) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'discussions', commentId));
  };

  const handleProvisionPostgres = async () => {
    const currentParams = project.parameters || [];
    if (currentParams.some(p => p.key === 'DATABASE_URL')) return;

    // Simulation de création d'une base de données façon Railway
    const fakeUrl = `postgres://glassforge_user:secret_${Math.random().toString(36).substring(7)}@db.railway.app:5432/${project.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    const newParams = [...currentParams, { key: 'DATABASE_URL', value: fakeUrl }];
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', project.id), {
      parameters: newParams
    });
  };

  const hasDatabase = project.parameters?.some(p => p.key === 'DATABASE_URL');

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 duration-500">
      
      {/* Header du projet */}
      <GlassCard className="p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-indigo-300">
              <span className="cursor-pointer hover:underline" onClick={() => navigateTo(project.ownerType === 'user' ? 'profile' : 'org', project.ownerId)}>{ownerName}</span>
              <span className="text-white/40">/</span>
              <span className="font-bold text-2xl text-white tracking-tight">{project.name}</span>
              <span className="ml-3 px-2.5 py-0.5 rounded-full border border-white/20 text-xs font-medium text-white/70 bg-white/5">Public</span>
            </div>
            <p className="text-lg text-white/80 mt-4 max-w-3xl">{project.description}</p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <GlassButton variant="secondary" onClick={() => toggleFavorite(project.id)}>
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} /> 
              {isFavorite ? 'Retirer' : 'Favori'}
            </GlassButton>
            {(isOwner || isAdmin) && (
              <GlassButton variant="danger" onClick={() => { if(window.confirm('Supprimer ce projet ?')) deleteProject(project.id); }}>
                <Trash2 className="w-4 h-4" />
              </GlassButton>
            )}
          </div>
        </div>

        {/* Tabs de navigation */}
        <div className="flex gap-6 mt-8 border-b border-white/10">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'overview' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-white/60 hover:text-white'}`}
          >
            <FolderGit2 className="w-4 h-4" /> Vue d'ensemble
          </button>
          <button 
            onClick={() => setActiveTab('database')} 
            className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'database' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-white/60 hover:text-white'}`}
          >
            <Database className="w-4 h-4" /> Bases de données
          </button>
        </div>
      </GlassCard>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Paramètres & Code (Gauche) */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-0 overflow-hidden border border-white/20">
              <div className="bg-black/40 px-4 py-3 border-b border-white/10 flex items-center gap-2 font-mono text-sm text-indigo-300">
                <Key className="w-4 h-4" /> Paramètres d'environnement du projet
              </div>
              <div className="p-6">
                {project.parameters && project.parameters.length > 0 ? (
                  <div className="bg-black/30 rounded-xl p-4 font-mono text-sm overflow-x-auto border border-white/5">
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        {project.parameters.map((param, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0">
                            <td className="py-2 pr-4 text-purple-300 font-semibold">{param.key}</td>
                            <td className="py-2 text-emerald-300 break-all">{param.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-white/50 italic text-center py-4">Aucun paramètre défini.</div>
                )}
              </div>
            </GlassCard>

          {/* Espace Discussions */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" /> Discussions
            </h3>
            
            <div className="space-y-6 mb-8">
              {projectDiscussions.map(comment => {
                const author = users.find(u => u.uid === comment.authorId);
                const isCommentAuthor = currentUser.uid === comment.authorId;
                
                return (
                  <div key={comment.id} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/30 shrink-0 flex items-center justify-center text-white font-bold border border-indigo-400/30 cursor-pointer" onClick={() => navigateTo('profile', comment.authorId)}>
                      {author ? author.displayName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="flex-1">
                      <div className="bg-black/20 border border-white/10 rounded-xl p-4 relative group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-indigo-300 cursor-pointer" onClick={() => navigateTo('profile', comment.authorId)}>
                            {author ? author.displayName : 'Utilisateur supprimé'}
                          </span>
                          <span className="text-xs text-white/40">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-white/90 whitespace-pre-wrap text-sm">{comment.content}</p>
                        
                        {(isCommentAuthor || isAdmin) && (
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="absolute top-4 right-4 text-red-400/0 group-hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {projectDiscussions.length === 0 && <p className="text-white/50 text-center italic py-4">Soyez le premier à lancer la discussion.</p>}
            </div>

            <div className="flex gap-3 items-start border-t border-white/10 pt-6">
               <div className="w-10 h-10 rounded-full bg-indigo-500/30 shrink-0 flex items-center justify-center text-white font-bold border border-indigo-400/30">
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
               <div className="flex-1 relative">
                 <GlassTextarea 
                    placeholder="Laissez un commentaire..." 
                    rows={2} 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                 />
                 <div className="flex justify-end mt-2">
                   <GlassButton onClick={handlePostComment} disabled={!commentText.trim()}>
                     <Send className="w-4 h-4" /> Commenter
                   </GlassButton>
                 </div>
               </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Projet (Droite) */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-6">
            <h4 className="font-bold text-white mb-4 border-b border-white/10 pb-2">À propos</h4>
            <div className="text-sm text-white/70 space-y-3">
              <p className="flex items-center gap-2"><Star className="w-4 h-4 text-white/50" /> {users.filter(u => u.favorites?.includes(project.id)).length} favoris</p>
              <p className="flex items-center gap-2"><Pin className="w-4 h-4 text-white/50" /> {users.filter(u => u.pinned?.includes(project.id)).length} épingles</p>
            </div>
          </GlassCard>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
          <GlassCard className="p-8">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-400" /> PostgreSQL
            </h3>
            <p className="text-white/70 mb-8">
              Provisionnez et gérez vos bases de données relationnelles directement depuis GlassForge.
            </p>

            {hasDatabase ? (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Base de données active</h4>
                    <p className="text-sm text-emerald-200/70">Connectée et prête à être associée à vos déploiements.</p>
                  </div>
                </div>
                <div className="bg-black/40 p-4 rounded-lg flex items-center justify-between border border-white/5">
                  <div className="font-mono text-sm text-white/80 overflow-x-auto">
                    {project.parameters.find(p => p.key === 'DATABASE_URL')?.value}
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-4">
                  Note : La variable <code className="text-indigo-300">DATABASE_URL</code> a été automatiquement injectée dans les paramètres de votre projet pour y accéder facilement depuis votre code.
                </p>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl bg-black/10">
                <Database className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">Aucune base de données</h4>
                <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
                  Besoin d'un espace de stockage relationnel ? Provisionnez une base de données PostgreSQL en un clic.
                </p>
                <GlassButton variant="primary" onClick={handleProvisionPostgres} className="mx-auto">
                  <Plus className="w-4 h-4" /> Provisionner PostgreSQL
                </GlassButton>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function CreateProjectView({ currentUser, organizations, navigateTo, db, appId }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [ownerId, setOwnerId] = useState(currentUser.uid); // uid ou orgId
  const [parameters, setParameters] = useState([{ key: '', value: '' }]);

  const handleAddParam = () => setParameters([...parameters, { key: '', value: '' }]);
  const handleRemoveParam = (idx) => setParameters(parameters.filter((_, i) => i !== idx));
  const handleParamChange = (idx, field, val) => {
    const newParams = [...parameters];
    newParams[idx][field] = val;
    setParameters(newParams);
  };

  const handleCreate = async () => {
    if (!name.trim()) return alert('Le nom est requis');
    
    const ownerType = ownerId === currentUser.uid ? 'user' : 'org';
    const cleanedParams = parameters.filter(p => p.key.trim() && p.value.trim());

    const newProject = {
      name: name.trim(),
      description: desc.trim(),
      ownerId,
      ownerType,
      parameters: cleanedParams,
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), newProject);
    navigateTo('project', docRef.id);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <GlassCard className="p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-indigo-400" /> Créer un nouveau dépôt
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Propriétaire</label>
            <select 
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm [&>option]:bg-slate-900"
              value={ownerId}
              onChange={e => setOwnerId(e.target.value)}
            >
              <option value={currentUser.uid}>{currentUser.displayName} (Personnel)</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name} (Organisation)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Nom du projet *</label>
            <GlassInput value={name} onChange={e => setName(e.target.value)} placeholder="ex: mon-super-projet" />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
            <GlassTextarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Courte description de votre projet..." rows={3} />
          </div>

          <div className="bg-black/20 p-6 rounded-xl border border-white/5">
            <label className="block text-sm font-medium text-white/80 mb-4 flex justify-between items-center">
              Paramètres d'environnement
              <button onClick={handleAddParam} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors bg-white/5 px-2 py-1 rounded">
                <Plus className="w-3 h-3" /> Ajouter variable
              </button>
            </label>
            
            <div className="space-y-3">
              {parameters.map((param, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <GlassInput 
                    placeholder="CLÉ (ex: PORT)" 
                    className="font-mono text-sm w-1/3"
                    value={param.key}
                    onChange={e => handleParamChange(idx, 'key', e.target.value)}
                  />
                  <GlassInput 
                    placeholder="Valeur (ex: 8080)" 
                    className="font-mono text-sm flex-1"
                    value={param.value}
                    onChange={e => handleParamChange(idx, 'value', e.target.value)}
                  />
                  <button onClick={() => handleRemoveParam(idx)} className="p-2.5 text-red-400 hover:bg-red-400/20 rounded-xl transition-colors border border-transparent">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {parameters.length === 0 && <p className="text-xs text-white/40 italic">Aucun paramètre.</p>}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <GlassButton variant="secondary" onClick={() => navigateTo('home')}>Annuler</GlassButton>
            <GlassButton variant="success" onClick={handleCreate}>Créer le dépôt</GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function CreateOrgView({ currentUser, navigateTo, db, appId }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const newOrg = {
      name: name.trim(),
      description: desc.trim(),
      members: [{ uid: currentUser.uid, role: 'admin' }],
      createdAt: Date.now()
    };
    const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'organizations'), newOrg);
    navigateTo('org', docRef.id);
  };

  return (
    <div className="max-w-xl mx-auto">
      <GlassCard className="p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Building className="w-6 h-6 text-purple-400" /> Créer une Organisation
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Nom de l'organisation *</label>
            <GlassInput value={name} onChange={e => setName(e.target.value)} placeholder="ex: Acme Corp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
            <GlassTextarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <GlassButton variant="secondary" onClick={() => navigateTo('home')}>Annuler</GlassButton>
            <GlassButton onClick={handleCreate} className="bg-purple-600/60 hover:bg-purple-500/80 border-purple-400/30">Créer</GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function OrgView({ orgId, organizations, projects, users, navigateTo }) {
  const org = organizations.find(o => o.id === orgId);
  if (!org) return <div>Organisation introuvable</div>;

  const orgProjects = projects.filter(p => p.ownerId === orgId && p.ownerType === 'org');

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <GlassCard className="p-10 flex items-center gap-8 bg-gradient-to-r from-purple-900/40 to-transparent border-purple-500/20">
        <div className="w-24 h-24 rounded-2xl bg-purple-500/30 border-2 border-purple-400/50 flex items-center justify-center text-purple-200">
          <Building className="w-12 h-12" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{org.name}</h1>
          <p className="text-lg text-white/70">{org.description}</p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
            <FolderGit2 className="w-5 h-5 text-indigo-400" /> Projets de l'organisation
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {orgProjects.map(p => (
              <ProjectCard key={p.id} project={p} users={users} organizations={organizations} onClick={() => navigateTo('project', p.id)} />
            ))}
            {orgProjects.length === 0 && <div className="text-white/50 p-6 text-center border border-dashed border-white/20 rounded-xl">Aucun projet dans cette organisation.</div>}
          </div>
        </div>
        
        <div className="md:col-span-1">
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <Users className="w-5 h-5 text-blue-400" /> Membres ({org.members?.length || 0})
            </h3>
            <div className="space-y-3">
              {org.members?.map(m => {
                const u = users.find(user => user.uid === m.uid);
                return (
                  <div key={m.uid} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors" onClick={() => navigateTo('profile', m.uid)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-sm font-bold">{u?.displayName?.charAt(0).toUpperCase()}</div>
                      <span className="font-medium text-sm text-white/90">{u?.displayName || 'Inconnu'}</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/60">{m.role}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// --- Composant utilitaire ---
function ProjectCard({ project, users, organizations, onClick, isPinned, onTogglePin }) {
  const owner = project.ownerType === 'user' 
    ? users.find(u => u.uid === project.ownerId)
    : organizations.find(o => o.id === project.ownerId);

  return (
    <GlassCard onClick={onClick} className="p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 relative group">
      {onTogglePin && (
        <button 
          onClick={onTogglePin} 
          className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          title={isPinned ? "Désépingler" : "Épingler"}
        >
          <Pin className={`w-4 h-4 ${isPinned ? 'fill-indigo-400 text-indigo-400' : ''}`} />
        </button>
      )}
      <div className="flex items-center gap-2 text-indigo-300 mb-2 font-medium">
        <FolderGit2 className="w-4 h-4 shrink-0" />
        <span className="truncate">{owner ? (owner.displayName || owner.name) : 'Inconnu'} / {project.name}</span>
      </div>
      <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-grow">{project.description || <span className="italic">Sans description</span>}</p>
      
      <div className="flex items-center gap-4 text-xs text-white/40 mt-auto pt-4 border-t border-white/5">
         <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Public</span>
         {project.parameters?.length > 0 && <span className="flex items-center gap-1"><Key className="w-3 h-3"/> Configuré</span>}
      </div>
    </GlassCard>
  );
}