# QuantGuide Question

## 1101. Couple Handshakes

**Metadata**

- ID: `E0hervdth5u1rj5h0Npf`
- URL: https://www.quantguide.io/questions/couple-handshakes
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Morgan Stanley, Five Rings
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-5 09:56:37 America/New_York
- Last Edited By: Gabe

### 题干

A room of four couples greet each other by shaking hands. If each person shakes the hand of every other person besides their partner, how many handshakes occur?

### Hint

How many pairs of people can be formed? How many pairs of people are couples?

### 解答

Each handshake consists of 2 people. The order of the people in the handshake is irrelevant, so there are $\binom{8}{2} = 28$ ways to pick pairs of people to shake hands. However, we know that no couple shakes hands with their partner. Therefore, we must remove one handshake for each couple representing the one that is with their partner. As there are 4 couples, we remove $4$ handshakes, and our total number of handshakes is $28 - 4 = 24$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "24"
    ],
    "companies": [
      {
        "company": "Morgan Stanley"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "E0hervdth5u1rj5h0Npf",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:56:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9004837,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Couple Handshakes",
    "topic": "brainteasers",
    "urlEnding": "couple-handshakes",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Morgan Stanley"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "easy",
    "id": "E0hervdth5u1rj5h0Npf",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Couple Handshakes",
    "topic": "brainteasers",
    "urlEnding": "couple-handshakes"
  }
}
```
