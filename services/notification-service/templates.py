STATUS_TEMPLATES = {
    "CREE": "Bonjour {nom}, votre colis {numero} a été enregistré.",
    "EN_ATTENTE": "Bonjour {nom}, votre colis {numero} est en attente de prise en charge.",
    "PRIS_EN_CHARGE": "Bonjour {nom}, votre colis {numero} a été pris en charge par le livreur.",
    "EN_COURS": "Bonjour {nom}, votre colis {numero} est en cours de livraison.",
    "ECHEC": "Bonjour {nom}, la livraison de votre colis {numero} a échoué{motif}.",
    "NOUVELLE_TENTATIVE": "Bonjour {nom}, une nouvelle tentative de livraison de votre colis {numero} est prévue.",
    "LIVRE": "Bonjour {nom}, votre colis {numero} a été livré. Merci de votre confiance.",
}

STATUS_CODES = frozenset(STATUS_TEMPLATES)


def build_status_message(status_code, recipient_name, tracking_number, reason=None, location=None):
    if status_code not in STATUS_TEMPLATES:
        raise ValueError(f"Code de statut inconnu : {status_code}")
    reason_suffix = f" : {reason.strip()}" if status_code == "ECHEC" and reason and reason.strip() else ""
    message = STATUS_TEMPLATES[status_code].format(
        nom=recipient_name,
        numero=tracking_number,
        motif=reason_suffix,
    )
    if location and location.strip():
        message += f" Localisation : {location.strip()}."
    return message
