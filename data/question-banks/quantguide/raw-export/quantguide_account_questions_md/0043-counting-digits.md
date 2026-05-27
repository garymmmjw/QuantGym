# QuantGuide Question

## 43. Counting Digits

**Metadata**

- ID: `6pNCI46QEGPVda0uGofd`
- URL: https://www.quantguide.io/questions/counting-digits
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: SIG, Virtu Financial, DRW, WorldQuant, Five Rings
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 6
- Last Edited: 2023-11-5 09:55:14 America/New_York
- Last Edited By: Gabe

### 题干

How many digits are in 99 to the 99th power?

### Hint

$$(1-\frac{1}{n})^n$ approaches $\frac{1}{e}$ as $n$ approaches infinity. How can you manipulate $99^{99}$ to achieve this form?

### 解答

There are 198 digits in $99^{99}$.

$$99^{99} = 99^{99} \times (\frac{100}{100})^{99} = 100^{99} \times (\frac{99}{100})^{99} = 10^{198} \times (1-\frac{1}{100})^{99} \approx 10^{198} \times (1-\frac{1}{100})^{100} \approx 10^{198} \times \frac{1}{e}$$

Thus, $99^{99}$ has 198 digits.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "198"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "DRW"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "6pNCI46QEGPVda0uGofd",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 09:55:14 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 314532,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Counting Digits",
    "topic": "brainteasers",
    "urlEnding": "counting-digits",
    "version": 6
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "DRW"
      },
      {
        "company": "WorldQuant"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "6pNCI46QEGPVda0uGofd",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Counting Digits",
    "topic": "brainteasers",
    "urlEnding": "counting-digits"
  }
}
```
