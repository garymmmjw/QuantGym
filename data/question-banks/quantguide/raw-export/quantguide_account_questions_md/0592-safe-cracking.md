# QuantGuide Question

## 592. Safe Cracking

**Metadata**

- ID: `aPtiTaULGBsdnXqNlTYm`
- URL: https://www.quantguide.io/questions/safe-cracking
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Citadel, IMC
- Source: N/A
- Tags: Combinatorics
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-6 10:49:32 America/New_York
- Last Edited By: Gabe

### 题干

An electronic safe has a three digit passcode. You are given three constraints regarding the code. Firstly, the code is not an odd number. Secondly, the code does not contain the number six. Lastly, one of the digits appears more than once. How many possible three digit entries satisfy these three requirements?

### Hint

Consider building the initial space of possibilities using the first two constraints, before casing on the third constraint.

### 解答

Let us look at the first two constraints while thinking about the possibilities of each of the three digits. The units digit must be an even number that is not six, and thus has four possibilities. The tens and hundreds place both have nine possibilities. Now onto the third constraint to determine the total number of codes that satisfy all three. In order for one of the digits to appear, there are four cases to consider: first two digits are the same and the third is different; the first and third digits are the same and the second is different, the second and third digits are the same and the first is different; all three digits are the same. We will consider each one separately.
$$\newline$$
Case 1: The first two digits are either the same odd number or the same even number. If they are both odd, then the third digit can be any of its four choices. If they are both even, then the third digit can be any of the three choices such that it is a different even number. The number of total possibilities is $5\times 4 + 4 \times 3 = 32$.
$$\newline$$
Case 2: The first and third digits can be any one of four choices, limited by the options that the third digit has. The second digit can be any one of the eight choices such that it is a different number. The number of total possibilities is $4 \times 8 = 32$.
$$\newline$$
Case 3: Note that this case is symmetrical to the previous case. The second and third digits can be any one of four choices, limited by the options that the third digit has. The first digit can be any one of the eight choices such that it is a different number. The number of total possibilities is $4 \times 8 = 32$. 
$$\newline$$
Case 4: The three digits can be any one of four choices, limited by the options that the third digit has. The number of total possibilities is $4$. 
$$\newline$$
In conclusion, the total number of three digit entries satisfy these three requirements is $32+32+32+4=100$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "100"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "aPtiTaULGBsdnXqNlTYm",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-6 10:49:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4738470,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Safe Cracking",
    "topic": "brainteasers",
    "urlEnding": "safe-cracking",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "IMC"
      }
    ],
    "difficulty": "hard",
    "id": "aPtiTaULGBsdnXqNlTYm",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Safe Cracking",
    "topic": "brainteasers",
    "urlEnding": "safe-cracking"
  }
}
```
