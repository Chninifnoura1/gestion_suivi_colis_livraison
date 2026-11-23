
STATUS_SUBJECTS = {
    "ECHEC": "Échec de livraison de votre colis",
    "LIVRE": "Confirmation de livraison de votre colis",
    "ARRIVEE_A_L_AGENCE": "Votre colis est arrivé à l'agence de destination",
}

STATUS_TEMPLATES = {
    "CREE": "Bonjour {nom}, votre colis {numero} a été enregistré.",
    "EN_ATTENTE": "Bonjour {nom}, votre colis {numero} est en attente de prise en charge.",
    "PRIS_EN_CHARGE": "Bonjour {nom}, votre colis {numero} a été pris en charge par le livreur.",
    "EN_COURS": "Bonjour {nom}, votre colis {numero} est en cours de livraison.",
    "ECHEC": (
        "Bonjour,\n\n"
        "Nous vous informons que la livraison de votre colis n'a pas pu aboutir.\n\n"
        "Nous vous invitons à contacter votre agence afin d'organiser une nouvelle tentative de livraison.\n\n"
        "Merci de votre compréhension.\n\n"
        "ColisTrack"
    ),
    "NOUVELLE_TENTATIVE": "Bonjour {nom}, une nouvelle tentative de livraison de votre colis {numero} est prévue.",
    "ARRIVEE_A_L_AGENCE": "Bonjour {nom}, votre colis {numero} est arrivé à l'agence de destination. Vous pouvez venir le récupérer.",
    "LIVRE": (
        "Bonjour,\n\n"
        "Nous vous confirmons que votre colis a été livré avec succès.\n\n"
        "Nous vous remercions d'avoir choisi notre service.\n\n"
        "ColisTrack"
    ),
}

STATUS_CODES = frozenset(STATUS_TEMPLATES)



def build_status_message(
    status_code, recipient_name, tracking_number, reason=None, location=None
):
    if status_code not in STATUS_TEMPLATES:
        raise ValueError(f"Code de statut inconnu : {status_code}")

    if status_code in ("ECHEC", "LIVRE"):
        return STATUS_TEMPLATES[status_code]

    if status_code == "ARRIVEE_A_L_AGENCE":
        agence = location.strip() if location and location.strip() else "votre agence de destination"
        return (
            f"Bonjour {recipient_name},\n\n"
            f"Nous vous informons que votre colis {tracking_number} "
            f"est arrivé à l'agence {agence}.\n\n"
            "Vous pouvez vous présenter à cette agence pour récupérer votre colis.\n\n"
            "Merci d'avoir choisi ColisTrack."
        )

    return STATUS_TEMPLATES[status_code].format(
        nom=recipient_name,
        numero=tracking_number,
    )



def build_status_subject(status_code):
    return STATUS_SUBJECTS.get(status_code, "Mise à jour de votre colis")
