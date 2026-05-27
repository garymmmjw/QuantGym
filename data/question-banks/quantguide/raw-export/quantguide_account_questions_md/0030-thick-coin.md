# QuantGuide Question

## 30. Thick Coin

**Metadata**

- ID: `33yz9ZngPB8MtKfCh75Y`
- URL: https://www.quantguide.io/questions/thick-coin
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: N/A
- Source: 50 challenging probs
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Let the radius of a penny be $1$. Assume that the thickness of the penny is non-negligible so that a flipped penny can land on its side. Find the thickness of the penny that, when flipped, has a $\dfrac{1}{3}$ chance of landing on its side. The answer is in the form $\dfrac{1}{\sqrt{k}}$ for an integer $k$. Find $k$. 

$$$$

$\textbf{Note:}$ There is no definite answer for this question. Take the approach of inscribing the penny in a sphere.

### Hint

When we inscribe the coin in the sphere, we should take the sphere and the coin to be concentric. The coin can be regarded as a right cylinder. Then, we select a uniformly random point on the surface of the sphere. If the radius that is drawn from the point that we select to the center strikes the cylinder, then we say that the coin landed on its side. A theorem in geometry helps simplify this problem. When two parallel planes cut a sphere, the surface of the sphere between the two planes is called a zone. The theorem states that the zone is proportional to the distance between the planes.

### 解答

When we inscribe the coin in the sphere, we should take the sphere and the coin to be concentric. The coin can be regarded as a right cylinder. Then, we select a uniformly random point on the surface of the sphere. If the radius that is drawn from the point that we select to the center strikes the cylinder, then we say that the coin landed on its side. 

$$$$

A theorem in geometry helps simplify this problem. When two parallel planes cut a sphere, the surface of the sphere between the two planes is called a zone. The theorem states that the zone is proportional to the distance between the planes. This means that our coin should be $\dfrac{1}{3}$ as thick as the sphere's diameter.  In this case, the "planes" are the head and tail faces of the coin, as we inscribe our cylinder into a sphere.

$$$$

The question here is how thick is the sphere? Let's call the radius $R$. The Pythagorean Theorem gives that $$R^2 = 1^2 + \left(\dfrac{R}{3}\right)^2$$ This is because the distance from the center of the coin to the upper face is the radius of the sphere. Additionally, we know that the radius of the coin is $1$ and the thickness (height) of the coin is $\dfrac{R}{3}$ from before. Solving this yields $R = \dfrac{3}{\sqrt{8}}$. However, we want $\dfrac{1}{3}(2R) = \dfrac{1}{\sqrt{2}}$. We want $2R$ because that is the diameter, and hence how thick the coin should be. Our answer is $k = 2$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [],
    "difficulty": "hard",
    "id": "33yz9ZngPB8MtKfCh75Y",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 210817,
    "source": "50 challenging probs",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Thick Coin",
    "topic": "probability",
    "urlEnding": "thick-coin"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "33yz9ZngPB8MtKfCh75Y",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Thick Coin",
    "topic": "probability",
    "urlEnding": "thick-coin"
  }
}
```
