# QuantGuide Question

## 352. Defining Standard Deviation

**Metadata**

- ID: `JaJ9AQ5aoUgmlWrTF7Ot`
- URL: https://www.quantguide.io/questions/defining-standard-deviation
- Topic: statistics
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:15:24 America/New_York
- Last Edited By: Gabe

### 题干

What is the sample standard deviation of $(1,2,3,4,5)$? Assume that we have drawn independent and identically distributed samples and are estimating the population parameter.

### Hint

When calculating the sample standard deviation, ensure that you are taking into account Bessel's Correction, else the estimation of the population variance will be biased. 

### 解答

$$\hat{\sigma} = \sqrt{\frac{\sum_i (x_i - \bar{x})^2}{N-1}} = \sqrt{\frac{\sum_{i=1} ^{5} (i - 3)^2}{5-1}} = \sqrt{\frac{5}{2}} \approx 1.58$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "(5/2)^.5",
      "1.58",
      "1.581"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "JaJ9AQ5aoUgmlWrTF7Ot",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:15:24 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2697420,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Defining Standard Deviation",
    "topic": "statistics",
    "urlEnding": "defining-standard-deviation"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "JaJ9AQ5aoUgmlWrTF7Ot",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Defining Standard Deviation",
    "topic": "statistics",
    "urlEnding": "defining-standard-deviation"
  }
}
```
