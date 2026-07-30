# SPECIFIKACE – JMA Tipovačka

> Tento dokument je hlavním dokumentem celého projektu.
>
> Popisuje, co aplikace dělá, jak se má chovat a jaké jsou cíle projektu.
>
> Pokud bude někdy rozpor mezi kódem a tímto dokumentem, nejdříve se upraví SPECIFIKACE a teprve potom kód.

---

# 1. Cíl projektu

JMA Tipovačka je univerzální webová aplikace pro pořádání sportovních tipovacích soutěží.

Projekt nesmí být závislý na jednom turnaji.

Musí umožnit vytvářet neomezené množství soutěží.

Například:

- Mistrovství světa
- Mistrovství Evropy
- Liga mistrů
- Extraliga
- NBA
- Euroliga
- Firemní soutěže
- Soukromé soutěže

Každá soutěž může mít vlastní:

- název
- logo
- banner
- pravidla
- bodování
- datum
- výši startovného

---

# 2. Hlavní filozofie projektu

Při vývoji platí následující pravidla.

## Jednoduchost

Pokud existují dvě řešení stejného problému, používá se jednodušší.

---

## Přehlednost

Aplikace musí být pochopitelná i člověku, který ji otevře poprvé.

---

## Univerzálnost

Nikdy neprogramovat funkci pouze pro jednu soutěž.

Každá funkce má fungovat pro libovolný turnaj.

---

## Mobil je stejně důležitý jako počítač.

Veškeré nové obrazovky se navrhují jako responzivní.

---

## Admin nesmí dělat zbytečnou práci.

Pokud lze něco automatizovat nebo provést hromadně, má to přednost.

---

# 3. Role uživatelů

Aplikace obsahuje dvě základní role.

## Admin

Spravuje soutěže.

Může:

- vytvářet soutěže
- upravovat soutěže
- mazat soutěže
- přidávat zápasy
- importovat zápasy
- zadávat výsledky
- nastavovat bodování
- potvrzovat platby
- schvalovat účastníky

---

## Hráč

Může:

- registrovat účet
- přihlásit se
- vstoupit do soutěže
- zaplatit startovné
- zadávat tipy
- sledovat pořadí
- sledovat vlastní výsledky

---

# 4. Struktura aplikace

Aplikace se skládá ze tří hlavních částí.

## Veřejná část

- Přihlášení
- Registrace
- Obnovení hesla
- Pravidla

---

## Uživatelská část

- Moje soutěže
- Program
- Tipování
- Moje body
- Tabulka
- Profil
- Platba

---

## Administrace

- Soutěže
- Zápasy
- Výsledky
- Účastníci
- Platby
- Nastavení

---

# 5. Bodování

Výchozí nastavení.

3 body

- přesný výsledek

1 bod

- správný vítěz nebo remíza

0 bodů

- špatný tip

Bonus:

- správný vítěz turnaje

Každá soutěž může mít vlastní bodování.

---

# 6. Co je již hotové

V době vytvoření této dokumentace je dokončeno:

- registrace
- přihlášení
- odhlášení
- dashboard
- vytváření soutěží
- přidávání zápasů
- editace zápasů
- mazání zápasů
- zadávání výsledků
- hromadný import zápasů

---

# 7. Co bude následovat

Další plán vývoje.

1. Role Admin / Hráč

2. Připojení uživatele do soutěže

3. Tipování

4. Uzamykání tipů

5. Automatické bodování

6. Tabulka pořadí

7. QR platby

8. Schvalování plateb

---

# 8. Zásady vývoje

Při vývoji dodržujeme následující pravidla.

- vždy dokončit jednu funkci, než začne další
- větší změny provádět pomocí celých souborů
- po každé větší změně aplikaci otestovat
- preferovat jednoduché řešení
- nepřidávat funkce, které zatím nejsou potřeba

---

Konec dokumentu.
