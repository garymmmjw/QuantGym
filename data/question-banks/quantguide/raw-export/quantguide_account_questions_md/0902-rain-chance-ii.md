# QuantGuide Question

## 902. Rain Chance II

**Metadata**

- ID: `8lrkfX8Dc4tvOHuTES7p`
- URL: https://www.quantguide.io/questions/rain-chance-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Virtu Financial
- Source: virtu
- Tags: Combinatorics, Events
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-8 10:06:31 America/New_York
- Last Edited By: Gabe

### 题干

This weekend, there is a $40\%$ chance it rains on Saturday and a $70\%$ chance it rains on Sunday. Without assuming independence, find the tightest upper bound on the probability it does not rain this weekend.

### Hint

Let $A$ and $B$ be the events that it rains on Saturday and Sunday, respectively. We want to upper bound $\mathbb{P}[(A \cup B)^c] = 1 - \mathbb{P}[A \cup B]$.

### 解答

Let $A$ and $B$ be the events that it rains on Saturday and Sunday, respectively. We want to upper bound $\mathbb{P}[(A \cup B)^c] = 1 - \mathbb{P}[A \cup B]$. To get the maximum upper bound, we need to minimize $\mathbb{P}[A \cup B]$. The extreme case to minimize the quantity is that $A \subseteq B$ i.e. rain on Saturday always implies rain on Sunday. If $A \subseteq B$, then $\mathbb{P}[A \cup B] = \mathbb{P}[B] = 0.7$. Therefore, $\mathbb{P}[(A \cup B)^c] \leq 1 - 0.7 = 0.3$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "0.3"
    ],
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "8lrkfX8Dc4tvOHuTES7p",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:06:31 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7393733,
    "randomizable": "",
    "source": "virtu",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Rain Chance II",
    "topic": "probability",
    "urlEnding": "rain-chance-ii",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Virtu Financial"
      }
    ],
    "difficulty": "easy",
    "id": "8lrkfX8Dc4tvOHuTES7p",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Rain Chance II",
    "topic": "probability",
    "urlEnding": "rain-chance-ii"
  }
}
```
