# QuantGuide Question

## 560. Lognormal I

**Metadata**

- ID: `U99j9QgJIR3URHLBBbJE`
- URL: https://www.quantguide.io/questions/exponential-normal
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: Citadel, Akuna, Vatic Labs
- Source: Citadel Glassdoor
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 5
- Last Edited: 2023-9-6 09:56:09 America/New_York
- Last Edited By: Gabe

### 题干

Suppose that $\ln(X) \sim N(0,1)$. Find $\ln(\mathbb{E}[X])$. 

### Hint

Let $Z \sim N(0,1)$. Then we can say that $X = e^{Z}$. We want to find $\mathbb{E}[X] = \mathbb{E}[e^Z] = M_Z(1)$, where $M_Z(\theta)$ is the MGF of $Z$. 

### 解答

Let $Z \sim N(0,1)$. Then we can say that $X = e^{Z}$. We want to find $\mathbb{E}[X] = \mathbb{E}[e^Z] = M_Z(1)$, where $M_Z(\theta)$ is the MGF of $Z$. The MGF of $Z \sim N(0,1)$ is $M_Z(\theta) = e^{\frac{1}{2}\theta^2}$. Therefore, $M_Z(1) = e^{\frac{1}{2}}$, so our answer is $\ln(e^{\frac{1}{2}}) = \dfrac{1}{2}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/2"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Vatic Labs"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "U99j9QgJIR3URHLBBbJE",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "lastEditedAt": "2023-9-6 09:56:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4490129,
    "source": "Citadel Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Lognormal I",
    "topic": "probability",
    "urlEnding": "exponential-normal",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "Akuna"
      },
      {
        "company": "Vatic Labs"
      }
    ],
    "difficulty": "easy",
    "id": "U99j9QgJIR3URHLBBbJE",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Lognormal I",
    "topic": "probability",
    "urlEnding": "exponential-normal"
  }
}
```
