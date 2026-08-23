import React, { useMemo, useState } from "react";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { fmt, inputStyle, T } from "../lib/theme";
import { totals } from "../lib/helpers";
import { Btn } from "./ui";

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  }).format(date);
};

const greeting = (client) => client?.nom ? `Bonjour ${client.nom},` : "Bonjour,";

function createMessages({ doc, client, entreprise, type }) {
  const companyName = entreprise?.nom || "Votre entreprise";
  const contact = greeting(client);

  if (type === "facture") {
    const total = totals(doc.lignes, doc.remiseGlobale).ttc;
    const balance = Math.max(0, total - Number(doc.regle || 0));
    const dueDate = formatDate(doc.echeance);
    const amountLine = doc.statut === "Partiellement payée"
      ? `Le solde restant à régler est de ${fmt(balance)}.`
      : `Le montant restant à régler est de ${fmt(balance)}.`;
    const deadline = dueDate ? `, dont l'échéance était fixée au ${dueDate}` : "";

    return {
      subject: `Relance concernant votre facture ${doc.id}`,
      email: `${contact}\n\nSauf erreur de notre part, nous n'avons pas encore reçu le règlement de votre facture ${doc.id}${deadline}.\n\n${amountLine} Nous vous remercions de bien vouloir procéder au paiement dans les meilleurs délais.\n\nSi le règlement a déjà été effectué, merci de ne pas tenir compte de ce message. Nous restons à votre disposition pour toute question.\n\nCordialement,\n${companyName}`,
      whatsapp: `${contact}\n\nNous nous permettons de vous relancer au sujet de la facture ${doc.id}${dueDate ? `, échue le ${dueDate}` : ""}. ${amountLine}\n\nSi le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.\n\nCordialement,\n${companyName}`,
    };
  }

  const issueDate = formatDate(doc.date);
  const total = totals(doc.lignes, doc.remiseGlobale).ttc;
  return {
    subject: `Suivi de votre devis ${doc.id}`,
    email: `${contact}\n\nNous revenons vers vous au sujet de notre devis ${doc.id}${issueDate ? `, transmis le ${issueDate}` : ""}, d'un montant de ${fmt(total)}.\n\nNous souhaitions savoir si ce devis est toujours à l'étude et si vous avez besoin d'informations complémentaires pour avancer dans votre décision.\n\nNous restons à votre disposition et serions ravis de vous accompagner sur ce projet.\n\nCordialement,\n${companyName}`,
    whatsapp: `${contact}\n\nNous revenons vers vous au sujet du devis ${doc.id}${issueDate ? ` transmis le ${issueDate}` : ""}, d'un montant de ${fmt(total)}. Est-il toujours à l'étude ?\n\nNous restons disponibles pour toute précision.\n\nCordialement,\n${companyName}`,
  };
}

export function ReminderComposer({ doc, client, entreprise, type, notify }) {
  const [channel, setChannel] = useState("email");
  const messages = useMemo(() => createMessages({ doc, client, entreprise, type }), [doc, client, entreprise, type]);
  const text = messages[channel];

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      notify?.(`${label} copié`);
    } catch {
      notify?.("La copie a échoué : sélectionnez le texte manuellement.");
    }
  };

  const isInvoice = type === "facture";
  return (
    <div>
      <p style={{ margin: "0 0 16px", color: T.inkSoft, fontSize: 13, lineHeight: 1.55 }}>
        Un modèle professionnel est généré à partir des informations de ce{isInvoice ? "tte facture" : " devis"}. Vous pouvez l'adapter avant de l'envoyer.
      </p>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[{ id: "email", label: "E-mail", icon: Mail }, { id: "whatsapp", label: "WhatsApp", icon: MessageCircle }].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setChannel(id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", borderRadius: 8, padding: "8px 11px", fontSize: 12.5, fontWeight: 600, border: `1px solid ${channel === id ? T.ink : T.line}`, color: channel === id ? T.invertFg : T.inkSoft, background: channel === id ? T.invert : T.paper }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      {channel === "email" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Objet</div>
          <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: T.ink }}>{messages.subject}</div>
        </div>
      )}
      <textarea readOnly value={text} aria-label={`Modèle de relance ${channel}`} style={{ ...inputStyle, height: 260, padding: "11px 12px", lineHeight: 1.55, fontSize: 12.5, resize: "vertical", marginBottom: 14 }} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn variant="gold" icon={Copy} onClick={() => copy(channel === "email" ? `Objet : ${messages.subject}\n\n${text}` : text, "Le message")}>Copier le modèle</Btn>
        {channel === "whatsapp" && (
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Btn variant="ghost" icon={MessageCircle}>Ouvrir WhatsApp</Btn>
          </a>
        )}
      </div>
    </div>
  );
}
