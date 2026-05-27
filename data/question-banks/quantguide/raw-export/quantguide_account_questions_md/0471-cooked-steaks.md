# QuantGuide Question

## 471. Cooked Steaks

**Metadata**

- ID: `rFz6e9IecPCAJXrmMJNr`
- URL: https://www.quantguide.io/questions/cooked-steaks
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: edited oq
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-26 10:15:27 America/New_York
- Last Edited By: Gabe

### 题干

$$4$ steaks are being cooked on a grill. The grill can cook one side at a time, and both sides must be cooked to be considered edible. Each side of the steak takes $2$ minutes to cook. The grill can hold up to $3$ steaks at a time. What is the minimum number of minutes it takes to cook all $4$ steaks?

### Hint

Let $A,B,C,$ and $D$ be the $4$ steaks and $A_1,A_2,B_1,B_2,C_1,C_2, D_1,$ and $D_2$ be the sides of all the steaks. The most basic way to do it would be pick three steaks, say $A,B,$ and $C$, and cook $A_1,B_1,$ and $C_1$ in the first two minutes, $A_2,B_2,$ and $C_2$ in the second period of two minutes, and then take $4$ minutes to cook $D$, yielding a total of $8$ minutes. This is inefficient because of the treatment of $D$. 

### 解答

Let $A,B,C,$ and $D$ be the $4$ steaks and $A_1,A_2,B_1,B_2,C_1,C_2, D_1,$ and $D_2$ be the sides of all the steaks. The most basic way to do it would be pick three steaks, say $A,B,$ and $C$, and cook $A_1,B_1,$ and $C_1$ in the first two minutes, $A_2,B_2,$ and $C_2$ in the second period of two minutes, and then take $4$ minutes to cook $D$, yielding a total of $8$ minutes. This is inefficient because of the treatment of $D$. 

$$$$

Note that there must be $8$ total "cookings", so the idea here is that we can start with $A_1,B_1,$ and $C_1$ cooked, taking two minutes. Afterwards, we want to get part of $D$ cooked, so now cook $A_2, B_2,$ and $D_1$, taking two minutes minutes. All that is left now is to cook $C_2$ and $D_2$, taking the last two minutes. In this way, we aren't wasting more time with $D$ being the only one on the grill. This yields a total of $6$ minutes, which is optimal because you can only cook $6$ sides in $4$ minutes, and there are $8$ sides total.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "rFz6e9IecPCAJXrmMJNr",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-26 10:15:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3755088,
    "source": "edited oq",
    "status": "published",
    "tags": [],
    "title": "Cooked Steaks",
    "topic": "brainteasers",
    "urlEnding": "cooked-steaks",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "easy",
    "id": "rFz6e9IecPCAJXrmMJNr",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Cooked Steaks",
    "topic": "brainteasers",
    "urlEnding": "cooked-steaks"
  }
}
```
